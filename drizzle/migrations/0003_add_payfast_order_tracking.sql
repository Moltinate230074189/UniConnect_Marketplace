ALTER TABLE public.orders ADD COLUMN payment_provider text NOT NULL DEFAULT 'payfast';
ALTER TABLE public.orders ADD COLUMN provider_payment_id text;
ALTER TABLE public.orders ADD CONSTRAINT orders_provider_payment_id_unique UNIQUE (provider_payment_id);
CREATE INDEX orders_status_created_idx ON public.orders(status, created_at DESC);