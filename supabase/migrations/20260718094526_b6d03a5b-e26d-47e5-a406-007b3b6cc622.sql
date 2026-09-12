
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_coupon_granted_at timestamptz;

-- Enforce at most one redemption of a given coupon per user.
CREATE UNIQUE INDEX IF NOT EXISTS coupon_redemptions_coupon_user_unique
  ON public.coupon_redemptions (coupon_id, user_id);
