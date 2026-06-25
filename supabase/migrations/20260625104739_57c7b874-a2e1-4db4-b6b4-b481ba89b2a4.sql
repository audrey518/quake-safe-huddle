
-- =====================================================================
-- 1. Restrict anon SELECT on InfoHub tables
-- =====================================================================
DROP POLICY IF EXISTS "Buildings readable by anon" ON public.buildings;
DROP POLICY IF EXISTS "Reports readable by anon" ON public.hazard_reports;
DROP POLICY IF EXISTS "Soil readable by anon" ON public.soil_data;
DROP POLICY IF EXISTS "Wells readable by anon" ON public.wells;
DROP POLICY IF EXISTS "Well readings readable by anon" ON public.well_readings;

REVOKE SELECT ON public.buildings, public.hazard_reports, public.soil_data, public.wells, public.well_readings FROM anon;

-- =====================================================================
-- 2. Providers: drop public-readable policy, add authenticated policy,
--    expose only safe columns to guests via a view
-- =====================================================================
DROP POLICY IF EXISTS "Anyone can view approved providers" ON public.providers;

CREATE POLICY "Authenticated can view approved providers"
  ON public.providers FOR SELECT TO authenticated
  USING (status = 'approved');

REVOKE SELECT ON public.providers FROM anon;

CREATE OR REPLACE VIEW public.providers_public
WITH (security_invoker = true) AS
SELECT id, name, blurb, location, category, status, created_at
FROM public.providers
WHERE status = 'approved';

-- Grant safe-column SELECT on base table to anon so the invoker-view can read it
GRANT SELECT (id, name, blurb, location, category, status, created_at) ON public.providers TO anon;

-- Anon policy needed for invoker view; only exposes safe columns due to column GRANT above
CREATE POLICY "Anon can view approved providers (safe cols only)"
  ON public.providers FOR SELECT TO anon
  USING (status = 'approved');

GRANT SELECT ON public.providers_public TO anon, authenticated;

-- =====================================================================
-- 3. user_roles: add restrictive policy preventing self-escalation
-- =====================================================================
DROP POLICY IF EXISTS "Users insert own local role" ON public.user_roles;
CREATE POLICY "Users insert own local role"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'local'::public.app_role);

CREATE POLICY "Block self-assigning non-local roles"
  ON public.user_roles AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    role = 'local'::public.app_role
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- =====================================================================
-- 4. Move SECURITY DEFINER functions out of public API schema
-- =====================================================================
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

-- 4a. private.has_role
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 4b. private.get_author_info
CREATE OR REPLACE FUNCTION private.get_author_info(_user_id uuid)
RETURNS TABLE(display_name text, is_professional boolean, contributions integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT p.display_name FROM public.profiles p WHERE p.id = _user_id), 'Member'),
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'professional'),
    (
      (SELECT COUNT(*) FROM public.buildings WHERE user_id = _user_id) +
      (SELECT COUNT(*) FROM public.wells WHERE user_id = _user_id) +
      (SELECT COUNT(*) FROM public.hazard_reports WHERE user_id = _user_id) +
      (SELECT COUNT(*) FROM public.soil_data WHERE user_id = _user_id)
    )::int;
$$;

-- 4c. private.get_user_discount
CREATE OR REPLACE FUNCTION private.get_user_discount(_user_id uuid)
RETURNS TABLE(tier text, discount_pct numeric, contributions integer, lifetime_spent numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT (
      (SELECT COUNT(*) FROM public.buildings WHERE user_id = _user_id) +
      (SELECT COUNT(*) FROM public.wells WHERE user_id = _user_id) +
      (SELECT COUNT(*) FROM public.hazard_reports WHERE user_id = _user_id) +
      (SELECT COUNT(*) FROM public.soil_data WHERE user_id = _user_id)
    )::int AS contributions
  ),
  s AS (
    SELECT COALESCE(SUM(price), 0)::numeric AS lifetime_spent
    FROM public.purchases
    WHERE user_id = _user_id AND COALESCE(status, 'new') <> 'cancelled'
  )
  SELECT
    CASE
      WHEN c.contributions >= 30 OR s.lifetime_spent >= 2000000 THEN 'platinum'
      WHEN c.contributions >= 15 OR s.lifetime_spent >= 500000  THEN 'gold'
      WHEN c.contributions >= 5  OR s.lifetime_spent >= 100000  THEN 'silver'
      ELSE 'bronze'
    END AS tier,
    CASE
      WHEN c.contributions >= 30 OR s.lifetime_spent >= 2000000 THEN 12
      WHEN c.contributions >= 15 OR s.lifetime_spent >= 500000  THEN 7
      WHEN c.contributions >= 5  OR s.lifetime_spent >= 100000  THEN 3
      ELSE 0
    END::numeric AS discount_pct,
    c.contributions,
    s.lifetime_spent
  FROM c, s;
$$;

-- 4d. private.handle_new_user (trigger on auth.users)
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, license_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)),
    NULLIF(NEW.raw_user_meta_data->>'license_number', '')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'local'));
  RETURN NEW;
END;
$$;

-- 4e. private.touch_updated_at
CREATE OR REPLACE FUNCTION private.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- 4f. Re-point triggers to private functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

DROP TRIGGER IF EXISTS trg_providers_updated ON public.providers;
CREATE TRIGGER trg_providers_updated
  BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

DROP TRIGGER IF EXISTS trg_provider_items_updated ON public.provider_items;
CREATE TRIGGER trg_provider_items_updated
  BEFORE UPDATE ON public.provider_items
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

-- =====================================================================
-- 5. Recreate RLS policies that referenced public.has_role
--    so they use private.has_role (kept reachable via public wrapper too)
-- =====================================================================
-- We'll keep public.has_role as a SECURITY INVOKER wrapper that delegates
-- to private.has_role. Policies can keep referencing has_role unqualified.

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;

-- CASCADE dropped all policies using has_role. Recreate them now.

-- Restore admin/role policies
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.has_role(_user_id, _role)
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

-- profiles policies
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- user_roles admin policies (recreate, dropped by CASCADE)
CREATE POLICY "Admins manage all roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- providers admin policy
CREATE POLICY "Admin can manage providers"
  ON public.providers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- soil_data professional policies
CREATE POLICY "Professionals insert soil"
  ON public.soil_data FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'professional'::public.app_role));

CREATE POLICY "Professionals update own soil"
  ON public.soil_data FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'professional'::public.app_role));

CREATE POLICY "Professionals delete own soil"
  ON public.soil_data FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'professional'::public.app_role));

-- Recreate the restrictive self-escalation guard (was dropped by CASCADE? — it didn't reference has_role; safe to re-add if missing)
DROP POLICY IF EXISTS "Block self-assigning non-local roles" ON public.user_roles;
CREATE POLICY "Block self-assigning non-local roles"
  ON public.user_roles AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    role = 'local'::public.app_role
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- =====================================================================
-- 6. Public wrappers for RPC-callable helpers (SECURITY INVOKER)
-- =====================================================================
DROP FUNCTION IF EXISTS public.get_author_info(uuid);
CREATE OR REPLACE FUNCTION public.get_author_info(_user_id uuid)
RETURNS TABLE(display_name text, is_professional boolean, contributions integer)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM private.get_author_info(_user_id)
$$;
REVOKE ALL ON FUNCTION public.get_author_info(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_author_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_author_info(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.get_user_discount(uuid);
CREATE OR REPLACE FUNCTION public.get_user_discount(_user_id uuid)
RETURNS TABLE(tier text, discount_pct numeric, contributions integer, lifetime_spent numeric)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM private.get_user_discount(_user_id)
$$;
REVOKE ALL ON FUNCTION public.get_user_discount(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_discount(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_discount(uuid) TO authenticated, service_role;

-- =====================================================================
-- 7. Drop the now-unused public trigger functions
-- =====================================================================
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.touch_updated_at() CASCADE;
