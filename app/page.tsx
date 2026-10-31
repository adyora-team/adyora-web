import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { StorefrontShell } from '@/components/storefront/StorefrontShell';
import { HeroSlider } from '@/components/storefront/HeroSlider';
import { CategorySection } from '@/components/storefront/CategorySection';
import { ProductGridSection } from '@/components/storefront/ProductGridSection';
import {
  getActiveHeroBanners,
  getPublishedProducts,
  getVisibleCategories,
  getVisibleHomepageSections,
  getWebsiteSettings,
} from '@/lib/cms';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';

const FALLBACK_CATEGORY_SLUGS = [
  { id: 'c1', name: 'Shirts', slug: 'shirts', display_order: 1 },
  { id: 'c2', name: 'Tees', slug: 'tees', display_order: 2 },
  { id: 'c3', name: 'Jeans', slug: 'jeans', display_order: 3 },
  { id: 'c4', name: 'Linen', slug: 'linen', display_order: 4 },
  { id: 'c5', name: 'Jackets', slug: 'jackets', display_order: 5 },
  { id: 'c6', name: 'Full Sleeves', slug: 'full-sleeves', display_order: 6 },
  { id: 'c7', name: 'Caps', slug: 'caps', display_order: 7 },
  { id: 'c8', name: 'Shoes', slug: 'shoes', display_order: 8 },
  { id: 'c9', name: 'Accessories', slug: 'accessories', display_order: 9 },
];

export default async function HomePage() {
  const [settings, heroBanners, dbCategories, sections, newArrivalsRes] =
    await Promise.all([
      getWebsiteSettings(),
      getActiveHeroBanners(),
      getVisibleCategories(),
      getVisibleHomepageSections(),
      getPublishedProducts({ flag: 'new_arrivals', pageSize: 10 }),
    ]);

  const categories =
    dbCategories.length > 0
      ? dbCategories
      : FALLBACK_CATEGORY_SLUGS.map((c) => ({
          ...c,
          description: '',
          cloudinary_public_id: '',
          image_url: '',
          image_focal_x: 50,
          image_focal_y: 50,
          is_visible: true,
          seo_title: '',
          seo_description: '',
          created_at: '',
          updated_at: '',
        }));

  const currencySymbol = settings.currency_symbol || '₹';

  // If homepage_sections table has no rows yet, render the two primary sections from the reference design
  if (sections.length === 0) {
    return (
      <StorefrontShell>
        <HeroSlider banners={heroBanners} />
        <CategorySection title="SHOP BY CATEGORY" categories={categories} />
        <ProductGridSection
          title="NEW ARRIVALS"
          products={newArrivalsRes.products}
          viewAllHref="/shop?filter=new_arrivals"
          currencySymbol={currencySymbol}
        />
      </StorefrontShell>
    );
  }

  // Otherwise render sections dynamically in admin-configured order
  return (
    <StorefrontShell>
      <HeroSlider banners={heroBanners} />

      {await Promise.all(
        sections.map(async (section) => {
          if (section.section_type === 'categories') {
            return (
              <CategorySection
                key={section.id}
                title={section.title || 'SHOP BY CATEGORY'}
                categories={categories.slice(0, section.items_limit || 9)}
              />
            );
          }

          if (section.section_type === 'new_arrivals') {
            return (
              <ProductGridSection
                key={section.id}
                title={section.title || 'NEW ARRIVALS'}
                subtitle={section.subtitle}
                products={newArrivalsRes.products.slice(
                  0,
                  section.items_limit || 10
                )}
                viewAllHref={section.button_link || '/shop?filter=new_arrivals'}
                currencySymbol={currencySymbol}
                backgroundColor={section.background_color || '#FFFFFF'}
                textColor={section.text_color || '#080808'}
              />
            );
          }

          if (
            section.section_type === 'featured_products' ||
            section.section_type === 'best_sellers' ||
            section.section_type === 'sale_products'
          ) {
            const flagMap = {
              featured_products: 'featured' as const,
              best_sellers: 'best_sellers' as const,
              sale_products: 'sale' as const,
            };
            const flag = flagMap[section.section_type];
            const { products } = await getPublishedProducts({
              flag,
              pageSize: section.items_limit || 10,
            });

            return (
              <ProductGridSection
                key={section.id}
                title={section.title}
                subtitle={section.subtitle}
                products={products}
                viewAllHref={section.button_link || `/shop?filter=${flag}`}
                currencySymbol={currencySymbol}
                backgroundColor={section.background_color || '#FFFFFF'}
                textColor={section.text_color || '#080808'}
              />
            );
          }

          if (section.section_type === 'promo_banner') {
            const bannerImg = section.banner_image_url
              ? getOptimizedCloudinaryUrl(section.banner_image_url, {
                  width: 1920,
                })
              : '';

            return (
              <section
                key={section.id}
                style={{
                  backgroundColor: section.background_color || '#080808',
                  color: section.text_color || '#FFFFFF',
                }}
                className="relative overflow-hidden py-16 sm:py-20"
              >
                {bannerImg && (
                  <img
                    src={bannerImg}
                    alt={section.title}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover opacity-40"
                  />
                )}
                <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 text-center">
                  <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight">
                    {section.title}
                  </h2>
                  {section.subtitle && (
                    <p className="mx-auto mt-3 max-w-xl text-xs sm:text-sm opacity-85">
                      {section.subtitle}
                    </p>
                  )}
                  {section.button_text && (
                    <Link
                      href={section.button_link || '/shop'}
                      className="mt-6 inline-flex items-center gap-2 bg-white px-6 py-3 text-xs font-extrabold uppercase tracking-wider text-[#080808] hover:bg-[#0066FF] hover:text-white transition"
                    >
                      <span>{section.button_text}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </section>
            );
          }

          return (
            <section
              key={section.id}
              style={{
                backgroundColor: section.background_color || '#F4F4F4',
                color: section.text_color || '#080808',
              }}
              className="py-12"
            >
              <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
                <h2 className="text-xl font-black uppercase tracking-tight">
                  {section.title}
                </h2>
                {section.subtitle && (
                  <p className="mt-2 max-w-2xl text-xs leading-relaxed opacity-80">
                    {section.subtitle}
                  </p>
                )}
              </div>
            </section>
          );
        })
      )}
    </StorefrontShell>
  );
}

