-- Make public role-check and discount RPCs self-sufficient (SECURITY DEFINER)
-- so authenticated/anon callers don't need USAGE on the private schema.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_discount(_user_id uuid)
RETURNS TABLE(tier text, discount_pct numeric, contributions integer, lifetime_spent numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrib int := 0;
  v_spent numeric := 0;
  v_tier text := 'bronze';
  v_pct numeric := 0;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM public.buildings WHERE user_id = _user_id) +
    (SELECT COUNT(*) FROM public.wells WHERE user_id = _user_id) +
    (SELECT COUNT(*) FROM public.hazard_reports WHERE user_id = _user_id) +
    (SELECT COUNT(*) FROM public.soil_data WHERE user_id = _user_id)
  INTO v_contrib;

  SELECT COALESCE(SUM(price), 0) INTO v_spent
  FROM public.purchases WHERE user_id = _user_id AND status = 'completed';

  IF v_spent >= 1000000 OR v_contrib >= 10 THEN v_tier := 'platinum'; v_pct := 15;
  ELSIF v_spent >= 500000 OR v_contrib >= 5 THEN v_tier := 'gold'; v_pct := 10;
  ELSIF v_spent >= 100000 OR v_contrib >= 2 THEN v_tier := 'silver'; v_pct := 5;
  ELSE v_tier := 'bronze'; v_pct := 0;
  END IF;

  RETURN QUERY SELECT v_tier, v_pct, v_contrib::int, v_spent;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_discount(uuid) TO anon, authenticated;