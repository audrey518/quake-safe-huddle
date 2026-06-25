ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS extras jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS photo_url text;

ALTER TABLE public.wells ADD COLUMN IF NOT EXISTS extras jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.soil_data ADD COLUMN IF NOT EXISTS extras jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.soil_data ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.soil_data ADD COLUMN IF NOT EXISTS ai_brief text;