
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS limited_password text,
  ADD COLUMN IF NOT EXISTS limited_granted_at timestamptz;
