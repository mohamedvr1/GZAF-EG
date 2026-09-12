
-- 1. Tighten atelier_applications INSERT
DROP POLICY IF EXISTS "Anyone can apply" ON public.atelier_applications;
CREATE POLICY "Anyone can apply"
ON public.atelier_applications
FOR INSERT
TO public
WITH CHECK (
  status = 'pending'
  AND admin_notes IS NULL
  AND char_length(email) BETWEEN 3 AND 255
  AND char_length(company_name) BETWEEN 1 AND 200
  AND char_length(contact_name) BETWEEN 1 AND 200
  AND char_length(country) BETWEEN 2 AND 100
  AND (message IS NULL OR char_length(message) <= 2000)
  AND (portfolio_url IS NULL OR char_length(portfolio_url) <= 500)
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- 2. Tighten newsletter_subscribers INSERT
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe"
ON public.newsletter_subscribers
FOR INSERT
TO public
WITH CHECK (
  is_active = true
  AND char_length(email) BETWEEN 3 AND 255
  AND (source IS NULL OR char_length(source) <= 100)
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- 3. Normalize notification_settings admin insert policy
DROP POLICY IF EXISTS "Admins insert notification settings" ON public.notification_settings;
CREATE POLICY "Admins insert notification settings"
ON public.notification_settings
FOR INSERT
TO authenticated
WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)));

-- 4. Hide price_override from anonymous storefront visitors (column-level grant)
REVOKE SELECT ON public.product_variants FROM anon;
GRANT SELECT (id, product_id, sku, size, color, stock, is_active, created_at, updated_at)
  ON public.product_variants TO anon;

-- 5. Audit log table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor_created ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_action_created ON public.audit_logs (action, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)));
-- Writes go through service_role only (no INSERT/UPDATE/DELETE policy for regular users).
