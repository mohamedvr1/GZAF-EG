
-- ============================================================
-- PHASE 10 — Performance indexes (additive, non-destructive)
-- ============================================================

-- Products
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_category_active_created
  ON public.products (category_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_active_created
  ON public.products (is_active, created_at DESC);

-- Variants
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants (product_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_created
  ON public.product_reviews (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user ON public.product_reviews (user_id);

-- Orders + items
CREATE INDEX IF NOT EXISTS idx_orders_user_created
  ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON public.orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items (product_id);

-- Wishlist
CREATE INDEX IF NOT EXISTS idx_wishlist_user_product
  ON public.wishlist (user_id, product_id);

-- Chat
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_updated
  ON public.chat_threads (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created
  ON public.chat_messages (thread_id, created_at);

-- Garment generations
CREATE INDEX IF NOT EXISTS idx_garment_generations_user_created
  ON public.garment_generations (user_id, created_at DESC);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant_created
  ON public.inventory_movements (variant_id, created_at DESC);

-- Coupons + redemptions
CREATE INDEX IF NOT EXISTS idx_coupons_active_code
  ON public.coupons (is_active, code);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user
  ON public.coupon_redemptions (user_id);

-- Atelier applications + newsletter
CREATE INDEX IF NOT EXISTS idx_atelier_applications_user
  ON public.atelier_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_atelier_applications_status_created
  ON public.atelier_applications (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscribers (email);

-- Categories
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);

-- Addresses
CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses (user_id);

-- User roles (already unique(user_id, role) but ensure lookup by user)
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles (user_id);

-- ============================================================
-- RLS rewrite: wrap auth.uid() and has_role(auth.uid(), ...) in
-- scalar subqueries so Postgres caches them per statement.
-- Semantics unchanged.
-- ============================================================

-- profiles
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

-- user_roles
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

-- addresses
DROP POLICY IF EXISTS "Users manage own addresses" ON public.addresses;
CREATE POLICY "Users manage own addresses" ON public.addresses
  FOR ALL USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- categories
DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
CREATE POLICY "Admins manage categories" ON public.categories
  FOR ALL USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

-- products
DROP POLICY IF EXISTS "Admins read all products" ON public.products;
CREATE POLICY "Admins read all products" ON public.products
  FOR SELECT USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

DROP POLICY IF EXISTS "Admins manage products" ON public.products;
CREATE POLICY "Admins manage products" ON public.products
  FOR ALL USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

-- wishlist
DROP POLICY IF EXISTS "Users manage own wishlist" ON public.wishlist;
CREATE POLICY "Users manage own wishlist" ON public.wishlist
  FOR ALL USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- orders
DROP POLICY IF EXISTS "Users read own orders" ON public.orders;
CREATE POLICY "Users read own orders" ON public.orders
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Atelier reads all orders" ON public.orders;
CREATE POLICY "Atelier reads all orders" ON public.orders
  FOR SELECT USING ((SELECT public.has_role((SELECT auth.uid()), 'atelier')));

DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
CREATE POLICY "Admins manage orders" ON public.orders
  FOR ALL USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

-- order_items
DROP POLICY IF EXISTS "Atelier reads all order items" ON public.order_items;
CREATE POLICY "Atelier reads all order items" ON public.order_items
  FOR SELECT USING ((SELECT public.has_role((SELECT auth.uid()), 'atelier')));

DROP POLICY IF EXISTS "Users read own order items" ON public.order_items;
CREATE POLICY "Users read own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins manage order items" ON public.order_items;
CREATE POLICY "Admins manage order items" ON public.order_items
  FOR ALL USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

-- product_variants
DROP POLICY IF EXISTS "Admins manage variants" ON public.product_variants;
CREATE POLICY "Admins manage variants" ON public.product_variants
  FOR ALL USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

-- inventory_movements
DROP POLICY IF EXISTS "Admins/atelier view inventory" ON public.inventory_movements;
CREATE POLICY "Admins/atelier view inventory" ON public.inventory_movements
  FOR SELECT USING (
    (SELECT public.has_role((SELECT auth.uid()), 'admin'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'atelier'))
  );

-- product_reviews
DROP POLICY IF EXISTS "Published reviews viewable by everyone" ON public.product_reviews;
CREATE POLICY "Published reviews viewable by everyone" ON public.product_reviews
  FOR SELECT USING (
    is_published = true
    OR (SELECT auth.uid()) = user_id
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'))
  );

DROP POLICY IF EXISTS "Users update own review" ON public.product_reviews;
CREATE POLICY "Users update own review" ON public.product_reviews
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users delete own review" ON public.product_reviews;
CREATE POLICY "Users delete own review" ON public.product_reviews
  FOR DELETE USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'))
  );

-- coupons
DROP POLICY IF EXISTS "Active coupons viewable by everyone" ON public.coupons;
CREATE POLICY "Active coupons viewable by everyone" ON public.coupons
  FOR SELECT USING (
    is_active = true
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'))
  );

DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;
CREATE POLICY "Admins manage coupons" ON public.coupons
  FOR ALL USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

-- coupon_redemptions
DROP POLICY IF EXISTS "Users view own redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users view own redemptions" ON public.coupon_redemptions
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'))
  );

-- newsletter_subscribers
DROP POLICY IF EXISTS "Admins view subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins view subscribers" ON public.newsletter_subscribers
  FOR SELECT USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

DROP POLICY IF EXISTS "Admins manage subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins manage subscribers" ON public.newsletter_subscribers
  FOR UPDATE USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

DROP POLICY IF EXISTS "Admins delete subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins delete subscribers" ON public.newsletter_subscribers
  FOR DELETE USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

-- atelier_applications
DROP POLICY IF EXISTS "Applicants view own; admins view all" ON public.atelier_applications;
CREATE POLICY "Applicants view own; admins view all" ON public.atelier_applications
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'))
  );

DROP POLICY IF EXISTS "Admins update applications" ON public.atelier_applications;
CREATE POLICY "Admins update applications" ON public.atelier_applications
  FOR UPDATE USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

DROP POLICY IF EXISTS "Admins delete applications" ON public.atelier_applications;
CREATE POLICY "Admins delete applications" ON public.atelier_applications
  FOR DELETE USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

-- chat_threads
DROP POLICY IF EXISTS "own threads" ON public.chat_threads;
CREATE POLICY "own threads" ON public.chat_threads
  FOR ALL USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- chat_messages
DROP POLICY IF EXISTS "own chat messages" ON public.chat_messages;
CREATE POLICY "own chat messages" ON public.chat_messages
  FOR ALL USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- garment_generations
DROP POLICY IF EXISTS "own generations - select" ON public.garment_generations;
CREATE POLICY "own generations - select" ON public.garment_generations
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'))
  );

DROP POLICY IF EXISTS "own generations - update" ON public.garment_generations;
CREATE POLICY "own generations - update" ON public.garment_generations
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "own generations - delete" ON public.garment_generations;
CREATE POLICY "own generations - delete" ON public.garment_generations
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- notification_settings
DROP POLICY IF EXISTS "Admins view notification settings" ON public.notification_settings;
CREATE POLICY "Admins view notification settings" ON public.notification_settings
  FOR SELECT USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

DROP POLICY IF EXISTS "Admins update notification settings" ON public.notification_settings;
CREATE POLICY "Admins update notification settings" ON public.notification_settings
  FOR UPDATE USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));
