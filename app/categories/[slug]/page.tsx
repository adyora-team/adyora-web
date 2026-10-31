import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { StorefrontShell } from '@/components/storefront/StorefrontShell';
import { ProductCard } from '@/components/storefront/ProductCard';
import {
  getCategoryBySlug,
  getPublishedProducts,
  getVisibleCategories,
  getWebsiteSettings,
} from '@/lib/cms';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    sort?: 'newest' | 'price_asc' | 'price_desc';
    page?: string;
  }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  const titleName = category?.name || slug.replace(/-/g, ' ').toUpperCase();
  return {
    title: category?.seo_title || `${titleName} — ADYORA Streetwear`,
    description:
      category?.seo_description ||
      category?.description ||
      `Shop ADYORA ${titleName} collection.`,
  };
}

export default async function CategoryListingPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = 20;

  const [settings, category, allCategories] = await Promise.all([
    getWebsiteSettings(),
    getCategoryBySlug(slug),
    getVisibleCategories(),
  ]);

  const { products, total } = category
    ? await getPublishedProducts({
        categoryId: category.id,
        sort: sp.sort || 'newest',
        page,
        pageSize,
      })
    : { products: [], total: 0 };

  const displayTitle = category?.name || slug.replace(/-/g, ' ');
  const currencySymbol = settings.currency_symbol || '₹';
  const totalPages = Math.ceil(total / pageSize);

  return (
    <StorefrontShell>
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 md:py-12">
        {/* Breadcrumb & Header */}
        <div className="border-b border-[#E5E5E5] pb-6">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            <Link href="/" className="hover:text-[#080808]">
              Home
            </Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-[#080808]">
              Categories
            </Link>
            <span>/</span>
            <span className="text-[#080808]">{displayTitle}</span>
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#080808]">
                {displayTitle}
              </h1>
              {category?.description && (
                <p className="mt-1.5 max-w-2xl text-xs text-neutral-500">
                  {category.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
              <span className="text-neutral-400">Sort:</span>
              {[
                { key: 'newest', label: 'Newest' },
                { key: 'price_asc', label: 'Price: Low-High' },
                { key: 'price_desc', label: 'Price: High-Low' },
              ].map((s) => {
                const isCurrent = (sp.sort || 'newest') === s.key;
                return (
                  <Link
                    key={s.key}
                    href={`/categories/${slug}?sort=${s.key}`}
                    className={`border px-3 py-1.5 transition ${
                      isCurrent
                        ? 'border-[#080808] bg-[#080808] text-white'
                        : 'border-[#E5E5E5] bg-white text-[#080808] hover:border-[#080808]'
                    }`}
                  >
                    {s.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Sibling Category Quick Nav */}
          {allCategories.length > 0 && (
            <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1">
              {allCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  className={`flex-shrink-0 border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                    cat.slug === slug
                      ? 'border-[#080808] bg-[#080808] text-white'
                      : 'border-[#E5E5E5] bg-[#F4F4F4] text-[#080808] hover:border-[#080808]'
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Product Grid */}
        <div className="mt-8">
          {products.length === 0 ? (
            <div className="border border-[#E5E5E5] bg-[#F4F4F4]/40 py-20 px-6 text-center">
              <p className="text-sm font-extrabold uppercase tracking-wider text-[#080808]">
                No products in {displayTitle} yet
              </p>
              <p className="mt-1.5 text-xs text-neutral-500">
                Assign published products to the &ldquo;{displayTitle}&rdquo; category in Admin &rarr; Products.
              </p>
              <Link
                href="/shop"
                className="mt-6 inline-block bg-[#080808] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0066FF] transition"
              >
                Explore All Products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  currencySymbol={currencySymbol}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/categories/${slug}?sort=${sp.sort || 'newest'}&page=${p}`}
                className={`flex h-9 w-9 items-center justify-center border text-xs font-bold ${
                  p === page
                    ? 'border-[#080808] bg-[#080808] text-white'
                    : 'border-[#E5E5E5] bg-white text-[#080808]'
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </StorefrontShell>
  );
}

