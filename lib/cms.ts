import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { OFFICIAL_ADYORA_LOGO_URL } from '@/lib/cloudinary';
import type {
  Category,
  CmsPage,
  FooterSettings,
  HeroBanner,
  HomepageSection,
  NavigationItem,
  Product,
  WebsiteSettings,
} from '@/types/database';

const DEFAULT_LOGO_URL = OFFICIAL_ADYORA_LOGO_URL;

function getPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  id: 'default',
  singleton_key: 'default',
  site_name: 'ADYORA',
  logo_public_id: 'ADYORA_Streetwear_E_Commerce_Mockup',
  logo_url: DEFAULT_LOGO_URL,
  favicon_public_id: '',
  favicon_url: '',
  primary_bg_color: '#FFFFFF',
  primary_text_color: '#080808',
  secondary_bg_color: '#F4F4F4',
  brand_accent_color: '#0066FF',
  border_color: '#E5E5E5',
  heading_font: 'Inter',
  body_font: 'Inter',
  announcement_text: 'FREE SHIPPING ON PREPAID ORDERS',
  announcement_visible: true,
  announcement_bg_color: '#080808',
  announcement_text_color: '#FFFFFF',
  announcement_link: '/shop',
  contact_email: 'support@adyora.in',
  contact_phone: '',
  whatsapp_number: '',
  store_address: '',
  instagram_url: '',
  facebook_url: '',
  youtube_url: '',
  currency_code: 'INR',
  currency_symbol: '₹',
  tax_percentage: 0,
  shipping_flat_rate: 0,
  free_shipping_threshold: 1999,
  default_seo_title: 'ADYORA — Premium Contemporary Streetwear & Fashion',
  default_seo_description:
    'Clean fits. Better days. Explore the latest contemporary streetwear collection from ADYORA.',
  og_image_public_id: '',
  og_image_url: '',
  google_analytics_id: '',
  meta_pixel_id: '',
  maintenance_mode: false,
  store_open: true,
  updated_at: new Date().toISOString(),
};

export const DEFAULT_FOOTER_SETTINGS: FooterSettings = {
  id: 'default',
  singleton_key: 'default',
  footer_logo_public_id: 'ADYORA_Streetwear_E_Commerce_Mockup',
  footer_logo_url: DEFAULT_LOGO_URL,
  footer_description:
    'Clean fits. Better days. Contemporary streetwear and elevated essentials crafted by ADYORA.',
  whatsapp_number: '',
  email_address: 'support@adyora.in',
  address: '',
  instagram_url: '',
  facebook_url: '',
  youtube_url: '',
  navigation_links: [
    { label: 'Shop Collection', href: '/shop' },
    { label: 'About Us', href: '/pages/about-us' },
    { label: 'Contact Us', href: '/pages/contact-us' },
    { label: 'FAQs', href: '/pages/faqs' },
  ],
  policy_links: [
    { label: 'Shipping Policy', href: '/pages/shipping-policy' },
    { label: 'Return Policy', href: '/pages/return-policy' },
    { label: 'Privacy Policy', href: '/pages/privacy-policy' },
    { label: 'Terms & Conditions', href: '/pages/terms-and-conditions' },
  ],
  copyright_text: `© ${new Date().getFullYear()} ADYORA. All rights reserved.`,
  payment_method_icons: ['UPI', 'Visa', 'Mastercard', 'RuPay', 'NetBanking'],
  is_visible: true,
  updated_at: new Date().toISOString(),
};

export const getWebsiteSettings = unstable_cache(
  async (): Promise<WebsiteSettings> => {
    try {
      const supabase = getPublicSupabase();
      const { data, error } = await supabase
        .from('website_settings')
        .select('*')
        .eq('singleton_key', 'default')
        .single();

      if (error || !data) return DEFAULT_WEBSITE_SETTINGS;
      return {
        ...DEFAULT_WEBSITE_SETTINGS,
        ...data,
        logo_public_id: 'adyora/brand/adyora_official_logo',
        logo_url: DEFAULT_LOGO_URL,
      } as WebsiteSettings;
    } catch {
      return DEFAULT_WEBSITE_SETTINGS;
    }
  },
  ['website-settings'],
  { revalidate: 300, tags: ['settings'] }
);

export const getFooterSettings = unstable_cache(
  async (): Promise<FooterSettings> => {
    try {
      const supabase = getPublicSupabase();
      const { data, error } = await supabase
        .from('footer_settings')
        .select('*')
        .eq('singleton_key', 'default')
        .single();

      if (error || !data) return DEFAULT_FOOTER_SETTINGS;
      return {
        ...DEFAULT_FOOTER_SETTINGS,
        ...data,
        footer_logo_public_id: 'adyora/brand/adyora_official_logo',
        footer_logo_url: DEFAULT_LOGO_URL,
      } as FooterSettings;
    } catch {
      return DEFAULT_FOOTER_SETTINGS;
    }
  },
  ['footer-settings'],
  { revalidate: 300, tags: ['footer'] }
);

export const getNavigationItems = unstable_cache(
  async (): Promise<NavigationItem[]> => {
    try {
      const supabase = getPublicSupabase();
      const { data, error } = await supabase
        .from('navigation_items')
        .select('id, parent_id, label, href, location, display_order, is_visible, created_at, updated_at')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });

      if (error || !data) return [];
      return data as NavigationItem[];
    } catch {
      return [];
    }
  },
  ['navigation-items'],
  { revalidate: 300, tags: ['navigation'] }
);

export const getVisibleCategories = unstable_cache(
  async (): Promise<Category[]> => {
    try {
      const supabase = getPublicSupabase();
      const { data, error } = await supabase
        .from('categories')
        .select(
          'id, name, slug, description, cloudinary_public_id, image_url, image_focal_x, image_focal_y, display_order, is_visible, seo_title, seo_description, created_at, updated_at'
        )
        .eq('is_visible', true)
        .order('display_order', { ascending: true });

      if (error || !data) return [];
      return data as Category[];
    } catch {
      return [];
    }
  },
  ['visible-categories'],
  { revalidate: 300, tags: ['categories'] }
);

export const getCategoryBySlug = unstable_cache(
  async (slug: string): Promise<Category | null> => {
    try {
      const supabase = getPublicSupabase();
      const { data, error } = await supabase
        .from('categories')
        .select(
          'id, name, slug, description, cloudinary_public_id, image_url, image_focal_x, image_focal_y, display_order, is_visible, seo_title, seo_description, created_at, updated_at'
        )
        .eq('slug', slug)
        .eq('is_visible', true)
        .single();

      if (error || !data) return null;
      return data as Category;
    } catch {
      return null;
    }
  },
  ['category-by-slug'],
  { revalidate: 300, tags: ['categories'] }
);

export const getActiveHeroBanners = unstable_cache(
  async (): Promise<HeroBanner[]> => {
    try {
      const supabase = getPublicSupabase();
      const { data, error } = await supabase
        .from('hero_banners')
        .select(
          'id, heading, subheading, button_text, button_link, desktop_public_id, desktop_image_url, mobile_public_id, mobile_image_url, focal_x, focal_y, display_order, is_visible, publish_start, publish_end, created_at, updated_at'
        )
        .eq('is_visible', true)
        .order('display_order', { ascending: true });

      if (error || !data) return [];
      const now = Date.now();
      return (data as HeroBanner[]).filter((b) => {
        if (b.publish_start && new Date(b.publish_start).getTime() > now) return false;
        if (b.publish_end && new Date(b.publish_end).getTime() < now) return false;
        return true;
      });
    } catch {
      return [];
    }
  },
  ['active-hero-banners'],
  { revalidate: 180, tags: ['hero'] }
);

export const getVisibleHomepageSections = unstable_cache(
  async (): Promise<HomepageSection[]> => {
    try {
      const supabase = getPublicSupabase();
      const { data, error } = await supabase
        .from('homepage_sections')
        .select('*')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });

      if (error || !data) return [];
      return data as HomepageSection[];
    } catch {
      return [];
    }
  },
  ['visible-homepage-sections'],
  { revalidate: 180, tags: ['homepage'] }
);

// Public product projection — strictly excludes cost_price
const PUBLIC_PRODUCT_SELECT = `
  id,
  name,
  slug,
  sku,
  description,
  category_id,
  selling_price,
  original_price,
  stock_quantity,
  sizes,
  colours,
  is_published,
  is_featured,
  is_new_arrival,
  is_best_seller,
  is_sale,
  seo_title,
  seo_description,
  created_at,
  updated_at,
  category:categories(id, name, slug),
  product_images(id, product_id, variant_id, cloudinary_public_id, image_url, alt_text, display_order, focal_x, focal_y)
`;

export const getPublishedProducts = unstable_cache(
  async (params?: {
    categoryId?: string;
    flag?: 'new_arrivals' | 'featured' | 'best_sellers' | 'sale';
    search?: string;
    sort?: 'newest' | 'price_asc' | 'price_desc';
    page?: number;
    pageSize?: number;
  }): Promise<{ products: Product[]; total: number }> => {
    try {
      const supabase = getPublicSupabase();
      const page = Math.max(1, params?.page || 1);
      const pageSize = Math.min(40, Math.max(1, params?.pageSize || 20));
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('products')
        .select(PUBLIC_PRODUCT_SELECT, { count: 'exact' })
        .eq('is_published', true);

      if (params?.categoryId) {
        query = query.eq('category_id', params.categoryId);
      }
      if (params?.flag === 'new_arrivals') {
        query = query.eq('is_new_arrival', true);
      } else if (params?.flag === 'featured') {
        query = query.eq('is_featured', true);
      } else if (params?.flag === 'best_sellers') {
        query = query.eq('is_best_seller', true);
      } else if (params?.flag === 'sale') {
        query = query.eq('is_sale', true);
      }

      if (params?.search && params.search.trim()) {
        query = query.ilike('name', `%${params.search.trim()}%`);
      }

      if (params?.sort === 'price_asc') {
        query = query.order('selling_price', { ascending: true });
      } else if (params?.sort === 'price_desc') {
        query = query.order('selling_price', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, count, error } = await query.range(from, to);

      if (error || !data) return { products: [], total: 0 };

      const normalized = (data as unknown as Product[]).map((p) => ({
        ...p,
        product_images: (p.product_images || []).sort(
          (a, b) => a.display_order - b.display_order
        ),
      }));

      return { products: normalized, total: count || 0 };
    } catch {
      return { products: [], total: 0 };
    }
  },
  ['published-products'],
  { revalidate: 120, tags: ['products'] }
);

export const getProductBySlug = unstable_cache(
  async (slug: string): Promise<Product | null> => {
    try {
      const supabase = getPublicSupabase();
      const { data, error } = await supabase
        .from('products')
        .select(
          `${PUBLIC_PRODUCT_SELECT}, product_variants(id, product_id, sku, size, colour_name, colour_hex, selling_price_override, stock_quantity, is_active, created_at, updated_at)`
        )
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error || !data) return null;
      const product = data as unknown as Product;
      product.product_images = (product.product_images || []).sort(
        (a, b) => a.display_order - b.display_order
      );
      return product;
    } catch {
      return null;
    }
  },
  ['product-by-slug'],
  { revalidate: 120, tags: ['products'] }
);

export const getPublishedPageBySlug = unstable_cache(
  async (slug: string): Promise<CmsPage | null> => {
    try {
      const supabase = getPublicSupabase();
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error || !data) return null;
      return data as CmsPage;
    } catch {
      return null;
    }
  },
  ['cms-page-by-slug'],
  { revalidate: 300, tags: ['pages'] }
);

