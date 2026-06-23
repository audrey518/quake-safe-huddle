
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('local', 'professional');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own roles on signup" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- handle_new_user trigger creates profile + default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'local'));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Buildings
CREATE TABLE public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  year_built INT NOT NULL,
  floors INT NOT NULL,
  material TEXT NOT NULL,
  risk_score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buildings TO authenticated;
GRANT ALL ON public.buildings TO service_role;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buildings readable by authenticated" ON public.buildings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own buildings" ON public.buildings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own buildings" ON public.buildings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own buildings" ON public.buildings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Wells
CREATE TABLE public.wells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  well_type TEXT NOT NULL,
  total_depth_m NUMERIC NOT NULL,
  current_level_m NUMERIC,
  measured_at TIMESTAMPTZ,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wells TO authenticated;
GRANT ALL ON public.wells TO service_role;
ALTER TABLE public.wells ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wells readable by authenticated" ON public.wells FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own wells" ON public.wells FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own wells" ON public.wells FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own wells" ON public.wells FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Well readings (history)
CREATE TABLE public.well_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id UUID NOT NULL REFERENCES public.wells(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_m NUMERIC NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.well_readings TO authenticated;
GRANT ALL ON public.well_readings TO service_role;
ALTER TABLE public.well_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Well readings readable by authenticated" ON public.well_readings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own well readings" ON public.well_readings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own well readings" ON public.well_readings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Hazard reports
CREATE TABLE public.hazard_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'moderate',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hazard_reports TO authenticated;
GRANT ALL ON public.hazard_reports TO service_role;
ALTER TABLE public.hazard_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports readable by authenticated" ON public.hazard_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own reports" ON public.hazard_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reports" ON public.hazard_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Soil data (professional submit, all read)
CREATE TABLE public.soil_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  soil_type TEXT NOT NULL,
  depth_m NUMERIC NOT NULL,
  layers JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.soil_data TO authenticated;
GRANT ALL ON public.soil_data TO service_role;
ALTER TABLE public.soil_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Soil readable by authenticated" ON public.soil_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Professionals insert soil" ON public.soil_data FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'professional'));
CREATE POLICY "Professionals update own soil" ON public.soil_data FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'professional'));
CREATE POLICY "Professionals delete own soil" ON public.soil_data FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'professional'));
