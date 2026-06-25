
ALTER TABLE public.wells ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.wells ADD COLUMN IF NOT EXISTS professional_notes text;
ALTER TABLE public.soil_data ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.soil_data ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS professional_notes text;
