CREATE TABLE public.instagram_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ig_user_id TEXT NOT NULL UNIQUE,
  username TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ig_conv_last_msg ON public.instagram_conversations(last_message_at DESC);

GRANT SELECT ON public.instagram_conversations TO authenticated;
GRANT ALL ON public.instagram_conversations TO service_role;

ALTER TABLE public.instagram_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view IG conversations"
ON public.instagram_conversations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ig_conv_updated_at
BEFORE UPDATE ON public.instagram_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();