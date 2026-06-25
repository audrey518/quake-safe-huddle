
ALTER TABLE public.provider_items ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS provider_item_id uuid REFERENCES public.provider_items(id) ON DELETE SET NULL;
