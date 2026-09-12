CREATE TABLE public.garment_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('try_on','lookbook','fabric','fit_advice')),
  prompt TEXT NOT NULL,
  product_slugs TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.garment_generations TO authenticated;
GRANT ALL ON public.garment_generations TO service_role;

ALTER TABLE public.garment_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own generations - select"
  ON public.garment_generations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "own generations - insert"
  ON public.garment_generations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own generations - update"
  ON public.garment_generations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own generations - delete"
  ON public.garment_generations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_garment_generations_updated_at
  BEFORE UPDATE ON public.garment_generations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_garment_generations_user ON public.garment_generations(user_id, created_at DESC);