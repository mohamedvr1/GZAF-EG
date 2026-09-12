ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS orders_contact_phone_idx ON public.orders (contact_phone);
CREATE INDEX IF NOT EXISTS orders_order_number_idx ON public.orders (order_number);