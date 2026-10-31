import React from 'react';
import Link from 'next/link';
import { StorefrontShell } from '@/components/storefront/StorefrontShell';
import { ProductCard } from '@/components/storefront/ProductCard';
import {
  getPublishedProducts,
  getVisibleCategories,
  getWebsiteSettings,
} from '@/lib/cms';

interface ShopPageProps {
  searchParams: Promise<{
    category?: string;
    filter?: 'new_arrivals' | 'featured' | 'best_sellers' | 'sale';
    q?: string;
    sort?: 'newest' | 'price_asc' | 'price_desc';
    page?: string;
  }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 20;

  const [settings, categories] = await Promise.all([
    getWebsiteSettings(),
    getVisibleCategories(),
  ]);

  const activeCategory = params.category
    ? categories.find((c) => c.slug === params.category)
    : undefined;

  const { products, total } = await getPublishedProducts({
    categoryId: activeCategory?.id,
    flag: params.filter,
    search: params.q,
    sort: params.sort || 'newest',
    page,
    pageSize,
  });

  const totalPages = Math.ceil(total / pageSize);
  const currencySymbol = settings.currency_symbol || '₹';

  return (
    <StorefrontShell>
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 md:py-12">
        {/* Page Header */}
        <div className="border-b border-[#E5E5E5] pb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#0066FF]">
            ADYORA CATALOGUE
          </p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#080808]">
                {params.q
                  ? `SEARCH: "${params.q}"`
                  : activeCategory
                  ? activeCategory.name
                  : params.filter
                  ? params.filter.replace('_', ' ')
                  : 'ALL COLLECTION'}
              </h1>
              <p className="mt-1 text-xs text-neutral-500">
                Showing {products.length} of {total} items
              </p>
            </div>

            {/* Sort Selector Links */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
              <span className="text-neutral-400 mr-1">Sort:</span>
              {[
                { key: 'newest', label: 'Newest' },
                { key: 'price_asc', label: 'Price: Low-High' },
                { key: 'price_desc', label: 'Price: High-Low' },
              ].map((s) => {
                const isCurrent = (params.sort || 'newest') === s.key;
                const sp = new URLSearchParams();
                if (params.category) sp.set('category', params.category);
                if (params.filter) sp.set('filter', params.filter);
                if (params.q) sp.set('q', params.q);
                sp.set('sort', s.key);
                return (
                  <Link
                    key={s.key}
                    href={`/shop?${sp.toString()}`}
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

          {/* Horizontal Category Pills */}
          {categories.length > 0 && (
            <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1">
              <Link
                href="/shop"
                className={`flex-shrink-0 border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                  !params.category
                    ? 'border-[#080808] bg-[#080808] text-white'
                    : 'border-[#E5E5E5] bg-[#F4F4F4] text-[#080808] hover:border-[#080808]'
                }`}
              >
                All
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  className={`flex-shrink-0 border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                    params.category === cat.slug
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
            <div className="border border-[#E5E5E5] bg-[#F4F4F4]/50 py-20 px-6 text-center">
              <p className="text-sm font-extrabold uppercase tracking-wider text-[#080808]">
                No products found
              </p>
              <p className="mt-1.5 text-xs text-neutral-500">
                {params.q
                  ? 'Try adjusting your search keywords or browse all categories.'
                  : 'Products added via the Admin Dashboard will appear here immediately.'}
              </p>
              <Link
                href="/shop"
                className="mt-6 inline-block bg-[#080808] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white"
              >
                Reset Filters
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
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
              (pageNum) => {
                const sp = new URLSearchParams();
                if (params.category) sp.set('category', params.category);
                if (params.filter) sp.set('filter', params.filter);
                if (params.q) sp.set('q', params.q);
                if (params.sort) sp.set('sort', params.sort);
                sp.set('page', String(pageNum));

                return (
                  <Link
                    key={pageNum}
                    href={`/shop?${sp.toString()}`}
                    className={`flex h-9 w-9 items-center justify-center border text-xs font-bold ${
                      pageNum === page
                        ? 'border-[#080808] bg-[#080808] text-white'
                        : 'border-[#E5E5E5] bg-white text-[#080808] hover:border-[#080808]'
                    }`}
                  >
                    {pageNum}
                  </Link>
                );
              }
            )}
          </div>
        )}
      </div>
    </StorefrontShell>
  );
}

