export type UserRole = 'customer' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role?: UserRole;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  cloudinary_public_id: string;
  image_url: string;
  image_focal_x: number;
  image_focal_y: number;
  display_order: number;
  is_visible: boolean;
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
}

export interface ProductColourOption {
  name: string;
  hex: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  size: string;
  colour_name: string;
  colour_hex: string;
  selling_price_override: number | null;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  cloudinary_public_id: string;
  image_url: string;
  alt_text: string;
  display_order: number;
  focal_x: number;
  focal_y: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  category_id: string | null;
  selling_price: number;
  original_price: number | null;
  cost_price?: number;
  stock_quantity: number;
  sizes: string[];
  colours: ProductColourOption[];
  is_published: boolean;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  is_sale: boolean;
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
  category?: Pick<Category, 'id' | 'name' | 'slug'> | null;
  product_images?: ProductImage[];
  product_variants?: ProductVariant[];
}

export interface HeroBanner {
  id: string;
  heading: string;
  subheading: string;
  button_text: string;
  button_link: string;
  desktop_public_id: string;
  desktop_image_url: string;
  mobile_public_id: string;
  mobile_image_url: string;
  focal_x: number;
  focal_y: number;
  display_order: number;
  is_visible: boolean;
  publish_start: string | null;
  publish_end: string | null;
  created_at: string;
  updated_at: string;
}

export type HomepageSectionType =
  | 'categories'
  | 'new_arrivals'
  | 'featured_products'
  | 'best_sellers'
  | 'sale_products'
  | 'promo_banner'
  | 'custom_text';

export interface HomepageSection {
  id: string;
  section_key: string;
  section_type: HomepageSectionType;
  title: string;
  subtitle: string;
  button_text: string;
  button_link: string;
  banner_public_id: string;
  banner_image_url: string;
  background_color: string;
  text_color: string;
  items_limit: number;
  display_order: number;
  is_visible: boolean;
  config_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NavigationItem {
  id: string;
  parent_id: string | null;
  label: string;
  href: string;
  location: 'main' | 'mobile' | 'both';
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  children?: NavigationItem[];
}

export interface WebsiteSettings {
  id: string;
  singleton_key: string;
  site_name: string;
  logo_public_id: string;
  logo_url: string;
  favicon_public_id: string;
  favicon_url: string;
  primary_bg_color: string;
  primary_text_color: string;
  secondary_bg_color: string;
  brand_accent_color: string;
  border_color: string;
  heading_font: string;
  body_font: string;
  announcement_text: string;
  announcement_visible: boolean;
  announcement_bg_color: string;
  announcement_text_color: string;
  announcement_link: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  store_address: string;
  instagram_url: string;
  facebook_url: string;
  youtube_url: string;
  currency_code: string;
  currency_symbol: string;
  tax_percentage: number;
  shipping_flat_rate: number;
  free_shipping_threshold: number;
  default_seo_title: string;
  default_seo_description: string;
  og_image_public_id: string;
  og_image_url: string;
  google_analytics_id: string;
  meta_pixel_id: string;
  maintenance_mode: boolean;
  store_open: boolean;
  updated_at: string;
}

export interface FooterLinkItem {
  label: string;
  href: string;
}

export interface FooterSettings {
  id: string;
  singleton_key: string;
  footer_logo_public_id: string;
  footer_logo_url: string;
  footer_description: string;
  whatsapp_number: string;
  email_address: string;
  address: string;
  instagram_url: string;
  facebook_url: string;
  youtube_url: string;
  navigation_links: FooterLinkItem[];
  policy_links: FooterLinkItem[];
  copyright_text: string;
  payment_method_icons: string[];
  is_visible: boolean;
  updated_at: string;
}

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  seo_title: string;
  seo_description: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_amount: number;
  minimum_order_value: number;
  maximum_discount: number | null;
  start_date: string;
  expiry_date: string | null;
  usage_limit: number | null;
  per_customer_limit: number;
  used_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Refunded';

export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  sku: string;
  size: string;
  colour: string;
  image_url: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: {
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  coupon_id: string | null;
  coupon_code: string;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  shipping_status: string;
  tracking_number: string;
  courier_name: string;
  order_notes: string;
  refund_status: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface EmailLog {
  id: string;
  recipient_email: string;
  template_type: string;
  subject: string;
  order_id: string | null;
  brevo_message_id: string;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  error_message: string;
  created_at: string;
}

