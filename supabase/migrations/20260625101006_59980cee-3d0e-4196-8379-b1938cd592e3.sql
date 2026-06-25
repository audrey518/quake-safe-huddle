
-- profiles: restrict SELECT to own + admin
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- providers: restrict anon to safe columns only via column-level grants
REVOKE SELECT ON public.providers FROM anon;
GRANT SELECT (id, name, blurb, location, category, status, user_id, created_at, updated_at) ON public.providers TO anon;

-- user_roles: restrict SELECT
DROP POLICY IF EXISTS "Roles readable by authenticated" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles: prevent self privilege escalation. Restrict client insert to 'local' role only.
DROP POLICY IF EXISTS "Users insert own roles on signup" ON public.user_roles;
CREATE POLICY "Users insert own local role" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'local'::public.app_role);
CREATE POLICY "Admins manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SECURITY DEFINER functions: revoke public/anon/authenticated EXECUTE on trigger-only functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Tighten RPC exposure: keep authenticated only where needed
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_discount(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_author_info(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_author_info(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_discount(uuid) TO authenticated;
