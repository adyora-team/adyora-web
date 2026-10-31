-- ============================================================================
-- ADYORA E-COMMERCE PLATFORM — COMPLETE RELATIONAL SCHEMA & RLS MIGRATION
-- Version: 001_initial_schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES & USER ROLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Helper function for RLS admin checks (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Trigger to automatically create profile and customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. CATEGORIES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  cloudinary_public_id TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  image_focal_x INTEGER NOT NULL DEFAULT 50 CHECK (image_focal_x BETWEEN 0 AND 100),
  image_focal_y INTEGER NOT NULL DEFAULT 50 CHECK (image_focal_y BETWEEN 0 AND 100),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_visible_order ON public.categories(is_visible, display_order ASC);

-- ----------------------------------------------------------------------------
-- 3. PRODUCTS, VARIANTS, IMAGES & INVENTORY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  selling_price NUMERIC(12, 2) NOT NULL CHECK (selling_price >= 0),
  original_price NUMERIC(12, 2) CHECK (original_price IS NULL OR original_price >= 0),
  cost_price NUMERIC(12, 2) DEFAULT 0 CHECK (cost_price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  sizes TEXT[] NOT NULL DEFAULT '{}',
  colours JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_new_arrival BOOLEAN NOT NULL DEFAULT TRUE,
  is_best_seller BOOLEAN NOT NULL DEFAULT FALSE,
  is_sale BOOLEAN NOT NULL DEFAULT FALSE,
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_published_created ON public.products(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_flags ON public.products(is_published, is_new_arrival, is_featured, is_best_seller, is_sale);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  size TEXT DEFAULT '',
  colour_name TEXT DEFAULT '',
  colour_hex TEXT DEFAULT '#080808',
  selling_price_override NUMERIC(12, 2) CHECK (selling_price_override IS NULL OR selling_price_override >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, size, colour_name)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);

CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  cloudinary_public_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  alt_text TEXT DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  focal_x INTEGER NOT NULL DEFAULT 50 CHECK (focal_x BETWEEN 0 AND 100),
  focal_y INTEGER NOT NULL DEFAULT 50 CHECK (focal_y BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_order ON public.product_images(product_id, display_order ASC);

CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON public.inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON public.inventory(quantity_available, low_stock_threshold);

-- ----------------------------------------------------------------------------
-- 4. HOMEPAGE CMS, HERO BANNERS & NAVIGATION
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hero_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  heading TEXT NOT NULL DEFAULT '',
  subheading TEXT DEFAULT '',
  button_text TEXT DEFAULT 'Shop Collection',
  button_link TEXT DEFAULT '/shop',
  desktop_public_id TEXT DEFAULT '',
  desktop_image_url TEXT NOT NULL DEFAULT '',
  mobile_public_id TEXT DEFAULT '',
  mobile_image_url TEXT DEFAULT '',
  focal_x INTEGER NOT NULL DEFAULT 50 CHECK (focal_x BETWEEN 0 AND 100),
  focal_y INTEGER NOT NULL DEFAULT 50 CHECK (focal_y BETWEEN 0 AND 100),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  publish_start TIMESTAMPTZ,
  publish_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hero_banners_visible_order ON public.hero_banners(is_visible, display_order ASC);

CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  section_type TEXT NOT NULL CHECK (section_type IN ('categories', 'new_arrivals', 'featured_products', 'best_sellers', 'sale_products', 'promo_banner', 'custom_text')),
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT DEFAULT '',
  button_text TEXT DEFAULT '',
  button_link TEXT DEFAULT '',
  banner_public_id TEXT DEFAULT '',
  banner_image_url TEXT DEFAULT '',
  background_color TEXT NOT NULL DEFAULT '#FFFFFF',
  text_color TEXT NOT NULL DEFAULT '#080808',
  items_limit INTEGER NOT NULL DEFAULT 10,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homepage_sections_visible_order ON public.homepage_sections(is_visible, display_order ASC);

CREATE TABLE IF NOT EXISTS public.navigation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.navigation_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'main' CHECK (location IN ('main', 'mobile', 'both')),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_navigation_items_visible_order ON public.navigation_items(is_visible, display_order ASC);

-- ----------------------------------------------------------------------------
-- 5. WEBSITE SETTINGS, FOOTER SETTINGS & PAGES CMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.website_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton_key TEXT NOT NULL UNIQUE DEFAULT 'default' CHECK (singleton_key = 'default'),
  site_name TEXT NOT NULL DEFAULT 'ADYORA',
  logo_public_id TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  favicon_public_id TEXT DEFAULT '',
  favicon_url TEXT DEFAULT '',
  primary_bg_color TEXT NOT NULL DEFAULT '#FFFFFF',
  primary_text_color TEXT NOT NULL DEFAULT '#080808',
  secondary_bg_color TEXT NOT NULL DEFAULT '#F4F4F4',
  brand_accent_color TEXT NOT NULL DEFAULT '#0066FF',
  border_color TEXT NOT NULL DEFAULT '#E5E5E5',
  heading_font TEXT NOT NULL DEFAULT 'Inter',
  body_font TEXT NOT NULL DEFAULT 'Inter',
  announcement_text TEXT NOT NULL DEFAULT 'FREE SHIPPING ON ORDERS OVER ₹1999 | CONTEMPORARY STREETWEAR',
  announcement_visible BOOLEAN NOT NULL DEFAULT TRUE,
  announcement_bg_color TEXT NOT NULL DEFAULT '#080808',
  announcement_text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  announcement_link TEXT DEFAULT '/shop',
  contact_email TEXT DEFAULT 'support@adyora.in',
  contact_phone TEXT DEFAULT '',
  whatsapp_number TEXT DEFAULT '',
  store_address TEXT DEFAULT '',
  instagram_url TEXT DEFAULT '',
  facebook_url TEXT DEFAULT '',
  youtube_url TEXT DEFAULT '',
  currency_code TEXT NOT NULL DEFAULT 'INR',
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  tax_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (tax_percentage >= 0),
  shipping_flat_rate NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (shipping_flat_rate >= 0),
  free_shipping_threshold NUMERIC(10, 2) NOT NULL DEFAULT 1999 CHECK (free_shipping_threshold >= 0),
  default_seo_title TEXT NOT NULL DEFAULT 'ADYORA — Premium Contemporary Streetwear & Fashion',
  default_seo_description TEXT NOT NULL DEFAULT 'Explore ADYORA contemporary streetwear, shirts, tees, jeans, linen, jackets, shoes, accessories, and caps.',
  og_image_public_id TEXT DEFAULT '',
  og_image_url TEXT DEFAULT '',
  google_analytics_id TEXT DEFAULT '',
  meta_pixel_id TEXT DEFAULT '',
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  store_open BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.footer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton_key TEXT NOT NULL UNIQUE DEFAULT 'default' CHECK (singleton_key = 'default'),
  footer_logo_public_id TEXT DEFAULT '',
  footer_logo_url TEXT DEFAULT '',
  footer_description TEXT NOT NULL DEFAULT 'Contemporary streetwear and elevated essentials crafted with precision.',
  whatsapp_number TEXT DEFAULT '',
  email_address TEXT DEFAULT 'support@adyora.in',
  address TEXT DEFAULT '',
  instagram_url TEXT DEFAULT '',
  facebook_url TEXT DEFAULT '',
  youtube_url TEXT DEFAULT '',
  navigation_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  policy_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  copyright_text TEXT NOT NULL DEFAULT '© ADYORA. All rights reserved.',
  payment_method_icons TEXT[] NOT NULL DEFAULT ARRAY['UPI', 'Visa', 'Mastercard', 'RuPay', 'NetBanking'],
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);

-- ----------------------------------------------------------------------------
-- 6. CARTS, WISHLISTS & CUSTOMER ADDRESSES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  selected_size TEXT DEFAULT '',
  selected_colour TEXT DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);

CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID NOT NULL REFERENCES public.wishlists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(wishlist_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id ON public.wishlist_items(wishlist_id);

CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT DEFAULT '',
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);

-- ----------------------------------------------------------------------------
-- 7. COUPONS, ORDERS, PAYMENTS & EMAIL LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_amount NUMERIC(10, 2) NOT NULL CHECK (discount_amount > 0),
  minimum_order_value NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (minimum_order_value >= 0),
  maximum_discount NUMERIC(10, 2) CHECK (maximum_discount IS NULL OR maximum_discount >= 0),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMPTZ,
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  per_customer_limit INTEGER NOT NULL DEFAULT 1 CHECK (per_customer_limit > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address JSONB NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  shipping_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  coupon_code TEXT DEFAULT '',
  payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Failed', 'Refunded')),
  order_status TEXT NOT NULL DEFAULT 'Pending' CHECK (order_status IN ('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded')),
  shipping_status TEXT NOT NULL DEFAULT 'Not Shipped',
  tracking_number TEXT DEFAULT '',
  courier_name TEXT DEFAULT '',
  order_notes TEXT DEFAULT '',
  refund_status TEXT DEFAULT 'None',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status, payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  sku TEXT DEFAULT '',
  size TEXT DEFAULT '',
  colour TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_user ON public.coupon_usage(coupon_id, user_id);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT DEFAULT '',
  razorpay_signature TEXT DEFAULT '',
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'refunded')),
  webhook_event_id TEXT UNIQUE,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON public.payments(razorpay_order_id);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  template_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  brevo_message_id TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 1,
  error_message TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_order_id ON public.email_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES FOR ALL 24 TABLES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.footer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view own profile or admin all" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users can update own profile or admin all" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());

-- USER ROLES (Only admins can modify roles; users can read own role)
CREATE POLICY "Users can read own role or admin all" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Only admins can manage roles" ON public.user_roles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- CATEGORIES
CREATE POLICY "Public can view visible categories" ON public.categories
  FOR SELECT USING (is_visible = TRUE OR public.is_admin());
CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PRODUCTS
CREATE POLICY "Public can view published products" ON public.products
  FOR SELECT USING (is_published = TRUE OR public.is_admin());
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PRODUCT VARIANTS
CREATE POLICY "Public can view variants of published products" ON public.product_variants
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_published = TRUE
    )
  );
CREATE POLICY "Admins can manage product variants" ON public.product_variants
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PRODUCT IMAGES
CREATE POLICY "Public can view images of published products" ON public.product_images
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_published = TRUE
    )
  );
CREATE POLICY "Admins can manage product images" ON public.product_images
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- INVENTORY
CREATE POLICY "Public can view inventory of published products" ON public.inventory
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_published = TRUE
    )
  );
CREATE POLICY "Admins can manage inventory" ON public.inventory
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- HERO BANNERS
CREATE POLICY "Public can view visible hero banners" ON public.hero_banners
  FOR SELECT USING (is_visible = TRUE OR public.is_admin());
CREATE POLICY "Admins can manage hero banners" ON public.hero_banners
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- HOMEPAGE SECTIONS
CREATE POLICY "Public can view visible homepage sections" ON public.homepage_sections
  FOR SELECT USING (is_visible = TRUE OR public.is_admin());
CREATE POLICY "Admins can manage homepage sections" ON public.homepage_sections
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- NAVIGATION ITEMS
CREATE POLICY "Public can view visible navigation items" ON public.navigation_items
  FOR SELECT USING (is_visible = TRUE OR public.is_admin());
CREATE POLICY "Admins can manage navigation items" ON public.navigation_items
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- WEBSITE SETTINGS
CREATE POLICY "Public can view website settings" ON public.website_settings
  FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage website settings" ON public.website_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- FOOTER SETTINGS
CREATE POLICY "Public can view footer settings" ON public.footer_settings
  FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage footer settings" ON public.footer_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PAGES
CREATE POLICY "Public can view published pages" ON public.pages
  FOR SELECT USING (is_published = TRUE OR public.is_admin());
CREATE POLICY "Admins can manage pages" ON public.pages
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- CARTS & CART ITEMS
CREATE POLICY "Users manage own cart" ON public.carts
  FOR ALL USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users manage own cart items" ON public.cart_items
  FOR ALL USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid()
    )
  );

-- WISHLISTS & WISHLIST ITEMS
CREATE POLICY "Users manage own wishlist" ON public.wishlists
  FOR ALL USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users manage own wishlist items" ON public.wishlist_items
  FOR ALL USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.wishlists w WHERE w.id = wishlist_id AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.wishlists w WHERE w.id = wishlist_id AND w.user_id = auth.uid()
    )
  );

-- ADDRESSES
CREATE POLICY "Users manage own addresses" ON public.addresses
  FOR ALL USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- COUPONS & COUPON USAGE
CREATE POLICY "Public can read active coupons" ON public.coupons
  FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "Admins manage coupons" ON public.coupons
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Users view own coupon usage or admin all" ON public.coupon_usage
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users insert own coupon usage or admin all" ON public.coupon_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ORDERS & ORDER ITEMS
CREATE POLICY "Users view own orders or admin all" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Authenticated users can create own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Users view own order items or admin all" ON public.order_items
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );
CREATE POLICY "Authenticated users can insert own order items" ON public.order_items
  FOR INSERT WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

-- PAYMENTS
CREATE POLICY "Users view own payments or admin all" ON public.payments
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );
CREATE POLICY "Authenticated users can create initial payment record" ON public.payments
  FOR INSERT WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );
CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- EMAIL LOGS
CREATE POLICY "Admins can view and manage email logs" ON public.email_logs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- 9. INITIAL CMS CONFIGURATION SEED (NO FAKE PRODUCTS OR PLACEHOLDER PHOTOS)
-- ============================================================================

INSERT INTO public.website_settings (
  singleton_key,
  site_name,
  logo_public_id,
  logo_url,
  announcement_text,
  announcement_visible,
  announcement_bg_color,
  announcement_text_color
)
VALUES (
  'default',
  'ADYORA',
  'adyora/brand/adyora_official_logo',
  'https://res.cloudinary.com/oykw0nwc/image/upload/f_auto,q_auto/v1793437509/adyora/brand/adyora_official_logo.png',
  'FREE SHIPPING ON PREPAID ORDERS',
  TRUE,
  '#080808',
  '#FFFFFF'
)
ON CONFLICT (singleton_key) DO NOTHING;

INSERT INTO public.footer_settings (
  singleton_key,
  footer_logo_public_id,
  footer_logo_url,
  footer_description,
  copyright_text,
  navigation_links,
  policy_links
)
VALUES (
  'default',
  'adyora/brand/adyora_official_logo',
  'https://res.cloudinary.com/oykw0nwc/image/upload/f_auto,q_auto/v1793437509/adyora/brand/adyora_official_logo.png',
  'Contemporary streetwear & elevated essentials designed with uncompromising quality.',
  '© 2026 ADYORA. All rights reserved.',
  '[
    {"label": "Shop All", "href": "/shop"},
    {"label": "About Us", "href": "/pages/about-us"},
    {"label": "Contact Us", "href": "/pages/contact-us"},
    {"label": "FAQs", "href": "/pages/faqs"}
  ]'::jsonb,
  '[
    {"label": "Shipping Policy", "href": "/pages/shipping-policy"},
    {"label": "Return Policy", "href": "/pages/return-policy"},
    {"label": "Privacy Policy", "href": "/pages/privacy-policy"},
    {"label": "Terms & Conditions", "href": "/pages/terms-and-conditions"}
  ]'::jsonb
)
ON CONFLICT (singleton_key) DO NOTHING;

-- Seed the 9 required ADYORA categories (images managed via Admin Cloudinary upload)
INSERT INTO public.categories (name, slug, display_order, is_visible)
VALUES
  ('Shirts', 'shirts', 1, TRUE),
  ('Tees', 'tees', 2, TRUE),
  ('Jeans', 'jeans', 3, TRUE),
  ('Linen', 'linen', 4, TRUE),
  ('Jackets', 'jackets', 5, TRUE),
  ('Full Sleeves', 'full-sleeves', 6, TRUE),
  ('Caps', 'caps', 7, TRUE),
  ('Shoes', 'shoes', 8, TRUE),
  ('Accessories', 'accessories', 9, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Seed default navigation items matching the reference header
INSERT INTO public.navigation_items (label, href, location, display_order, is_visible)
SELECT v.label, v.href, 'both', v.display_order, TRUE
FROM (
  VALUES
    ('Home', '/', 0),
    ('Shirts', '/categories/shirts', 1),
    ('Tees', '/categories/tees', 2),
    ('Jeans', '/categories/jeans', 3),
    ('Linen', '/categories/linen', 4),
    ('Full Sleeves', '/categories/full-sleeves', 5),
    ('Jackets', '/categories/jackets', 6),
    ('Shoes', '/categories/shoes', 7),
    ('Accessories', '/categories/accessories', 8),
    ('Caps', '/categories/caps', 9)
) AS v(label, href, display_order)
WHERE NOT EXISTS (SELECT 1 FROM public.navigation_items LIMIT 1);

-- Seed default homepage sections
INSERT INTO public.homepage_sections (section_key, section_type, title, subtitle, items_limit, display_order, is_visible)
VALUES
  ('categories_grid', 'categories', 'SHOP BY CATEGORY', '', 9, 1, TRUE),
  ('new_arrivals', 'new_arrivals', 'NEW ARRIVALS', 'Latest drops in contemporary streetwear', 10, 2, TRUE),
  ('featured_collection', 'featured_products', 'FEATURED COLLECTION', '', 5, 3, FALSE),
  ('best_sellers', 'best_sellers', 'BEST SELLERS', '', 5, 4, FALSE)
ON CONFLICT (section_key) DO NOTHING;

-- Seed default CMS policy & info pages
INSERT INTO public.pages (title, slug, content, is_published)
VALUES
  ('About Us', 'about-us', '<h2>About ADYORA</h2><p>ADYORA is a contemporary streetwear and fashion house focused on clean silhouettes, heavyweight fabrics, and timeless urban utility.</p>', TRUE),
  ('Contact Us', 'contact-us', '<h2>Contact ADYORA</h2><p>For order inquiries, styling assistance, or press requests, reach out to our customer care team via email or WhatsApp.</p>', TRUE),
  ('FAQs', 'faqs', '<h2>Frequently Asked Questions</h2><p>Find answers regarding sizing, order tracking, shipping timelines, and returns.</p>', TRUE),
  ('Shipping Policy', 'shipping-policy', '<h2>Shipping Policy</h2><p>Orders are processed within 24–48 business hours and shipped via trusted national courier partners with real-time tracking.</p>', TRUE),
  ('Return Policy', 'return-policy', '<h2>Return & Exchange Policy</h2><p>Easy 7-day returns and size exchanges on unworn items with original tags intact.</p>', TRUE),
  ('Privacy Policy', 'privacy-policy', '<h2>Privacy Policy</h2><p>Your personal data and payment security are protected using industry-standard encryption and strict access controls.</p>', TRUE),
  ('Terms and Conditions', 'terms-and-conditions', '<h2>Terms & Conditions</h2><p>By accessing or purchasing from ADYORA, you agree to our standard terms of service and conditions of sale.</p>', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 10. CREATE DEFAULT ADMIN ACCOUNT (EMAIL + PASSWORD FOR /admin LOGIN)
-- Admin Email: adyoraclothing.in@gmail.com
-- Admin Pass : Adyora@Admin2026
-- ============================================================================
DO $$
DECLARE
  v_admin_id UUID := gen_random_uuid();
  v_admin_email TEXT := 'adyoraclothing.in@gmail.com';
  v_admin_password TEXT := 'Adyora@Admin2026';
BEGIN
  -- Create or update admin user in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_admin_email) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id,
      'authenticated',
      'authenticated',
      v_admin_email,
      crypt(v_admin_password, gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ADYORA Admin"}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      v_admin_id,
      jsonb_build_object(
        'sub', v_admin_id::text,
        'email', v_admin_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      v_admin_id::text,
      NOW(),
      NOW(),
      NOW()
    );
  ELSE
    SELECT id INTO v_admin_id FROM auth.users WHERE email = v_admin_email LIMIT 1;

    UPDATE auth.users
    SET
      encrypted_password = crypt(v_admin_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
    WHERE id = v_admin_id;
  END IF;

  -- Ensure profile exists and assign 'admin' role in user_roles
  INSERT INTO public.profiles (id, email, full_name, is_active)
  VALUES (v_admin_id, v_admin_email, 'ADYORA Admin', TRUE)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, is_active = TRUE;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_admin_id, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin', updated_at = NOW();
END $$;

