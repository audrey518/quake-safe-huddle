
-- Enums
DO $$ BEGIN
  CREATE TYPE public.provider_category AS ENUM ('materials','engineering','water','insurance');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('new','accepted','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- providers
CREATE TABLE IF NOT EXISTS public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  name text NOT NULL,
  category public.provider_category NOT NULL,
  blurb text,
  location text,
  phone text,
  contact_email text,
  license_number text,
  telegram_chat_id text,
  status public.provider_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.providers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.providers TO authenticated;
GRANT ALL ON public.providers TO service_role;

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved providers"
  ON public.providers FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Owner can view own provider row"
  ON public.providers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owner can insert own provider row"
  ON public.providers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Owner can update own provider row"
  ON public.providers FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can manage providers"
  ON public.providers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- provider_items
CREATE TABLE IF NOT EXISTS public.provider_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  unit text,
  appointment boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_items_provider ON public.provider_items(provider_id);

GRANT SELECT ON public.provider_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_items TO authenticated;
GRANT ALL ON public.provider_items TO service_role;

ALTER TABLE public.provider_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active items of approved providers"
  ON public.provider_items FOR SELECT
  USING (active = true AND EXISTS (
    SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.status = 'approved'
  ));

CREATE POLICY "Owner can view own items"
  ON public.provider_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));

CREATE POLICY "Owner can manage own items"
  ON public.provider_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));

CREATE POLICY "Admin can manage items"
  ON public.provider_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Extend purchases & appointments
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status public.order_status NOT NULL DEFAULT 'new';

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status public.order_status NOT NULL DEFAULT 'new';

CREATE INDEX IF NOT EXISTS idx_purchases_provider_user ON public.purchases(provider_user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_provider_user ON public.appointments(provider_user_id);

DROP POLICY IF EXISTS "Provider can view own purchases" ON public.purchases;
CREATE POLICY "Provider can view own purchases"
  ON public.purchases FOR SELECT TO authenticated
  USING (provider_user_id = auth.uid());

DROP POLICY IF EXISTS "Provider can update own purchases" ON public.purchases;
CREATE POLICY "Provider can update own purchases"
  ON public.purchases FOR UPDATE TO authenticated
  USING (provider_user_id = auth.uid())
  WITH CHECK (provider_user_id = auth.uid());

DROP POLICY IF EXISTS "Provider can view own appointments" ON public.appointments;
CREATE POLICY "Provider can view own appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (provider_user_id = auth.uid());

DROP POLICY IF EXISTS "Provider can update own appointments" ON public.appointments;
CREATE POLICY "Provider can update own appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (provider_user_id = auth.uid())
  WITH CHECK (provider_user_id = auth.uid());

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_providers_updated ON public.providers;
CREATE TRIGGER trg_providers_updated BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_provider_items_updated ON public.provider_items;
CREATE TRIGGER trg_provider_items_updated BEFORE UPDATE ON public.provider_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed catalog
WITH ins AS (
  INSERT INTO public.providers (name, category, blurb, location, phone, status)
  VALUES
    ('Shree Cement Depot','materials','Quality OPC/PPC cement, rebar and aggregates with bulk delivery.','Kathmandu','+977-1-4000111','approved'),
    ('Himal Bricks & Blocks','materials','Fly-ash bricks and AAC blocks engineered for seismic walls.','Bhaktapur','+977-1-6610222','approved'),
    ('QuakeShield Engineers','engineering','Licensed structural engineers — assessments, retrofit design, supervision.','Lalitpur','+977-1-5550333','approved'),
    ('Terra Consult','engineering','Geotechnical and soil investigation specialists.','Pokhara','+977-61-540444','approved'),
    ('PureLife Water Systems','water','RO + UV filtration installation and annual servicing.','Kathmandu','+977-1-4001234','approved'),
    ('Sagarmatha Insurance','insurance','Earthquake & fire home insurance with fast claims.','Nationwide','+977-1-4220555','approved'),
    ('Everest General Insurance','insurance','Flexible property and flood coverage plans.','Nationwide','+977-1-4220666','approved')
  RETURNING id, name
)
INSERT INTO public.provider_items (provider_id, name, price, unit, appointment)
SELECT ins.id, x.item_name, x.price, x.unit, x.appointment
FROM ins
JOIN (VALUES
  ('Shree Cement Depot','OPC Cement (50kg)',950::numeric,'bag',false),
  ('Shree Cement Depot','PPC Cement (50kg)',880::numeric,'bag',false),
  ('Shree Cement Depot','TMT Rebar 12mm',1250::numeric,'rod',false),
  ('Himal Bricks & Blocks','Fly-ash Brick',18::numeric,'piece',false),
  ('Himal Bricks & Blocks','AAC Block 600x200x100',95::numeric,'piece',false),
  ('QuakeShield Engineers','Building Safety Assessment',7500::numeric,NULL,true),
  ('QuakeShield Engineers','Retrofit Design Consultation',15000::numeric,NULL,true),
  ('Terra Consult','Soil Investigation Visit',9000::numeric,NULL,true),
  ('PureLife Water Systems','RO Filter Installation',22000::numeric,NULL,true),
  ('PureLife Water Systems','Annual Maintenance Visit',2500::numeric,NULL,true),
  ('PureLife Water Systems','Water Quality Test',1200::numeric,NULL,true),
  ('Sagarmatha Insurance','Home Earthquake Cover (1 yr)',5500::numeric,NULL,true),
  ('Sagarmatha Insurance','Earthquake + Fire Bundle (1 yr)',8800::numeric,NULL,true),
  ('Everest General Insurance','Flood & Landslide Add-on (1 yr)',3200::numeric,NULL,true)
) AS x(provider_name, item_name, price, unit, appointment)
ON x.provider_name = ins.name;
