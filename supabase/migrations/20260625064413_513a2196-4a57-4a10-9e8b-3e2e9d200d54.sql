
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS subtotal numeric,
  ADD COLUMN IF NOT EXISTS discount_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_commission numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_payout numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.get_user_discount(_user_id uuid)
RETURNS TABLE(tier text, discount_pct numeric, contributions integer, lifetime_spent numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
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

GRANT EXECUTE ON FUNCTION public.get_user_discount(uuid) TO authenticated, anon, service_role;
