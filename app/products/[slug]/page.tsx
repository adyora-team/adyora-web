import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StorefrontShell } from '@/components/storefront/StorefrontShell';
import { ProductDetailClient } from '@/components/storefront/ProductDetailClient';
import { ProductGridSection } from '@/components/storefront/ProductGridSection';
import {
  getProductBySlug,
  getPublishedProducts,
  getWebsiteSettings,
} from '@/lib/cms';
import { extractPdpConfig } from '@/lib/pdp-config';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return { title: 'Product Not Found' };
  }
  const { cleanDescription } = extractPdpConfig(product.description);
  return {
    title: product.seo_title || product.name,
    description:
      product.seo_description ||
      cleanDescription?.slice(0, 160) ||
      `Shop ${product.name} at ADYORA.`,
    openGraph: {
      title: product.seo_title || product.name,
      description: product.seo_description || cleanDescription?.slice(0, 160),
      images: product.product_images?.[0]?.image_url
        ? [product.product_images[0].image_url]
        : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const [settings, product] = await Promise.all([
    getWebsiteSettings(),
    getProductBySlug(slug),
  ]);

  if (!product) {
    notFound();
  }

  const relatedRes = await getPublishedProducts({
    categoryId: product.category_id || undefined,
    pageSize: 6,
  });

  const relatedProducts = relatedRes.products
    .filter((p) => p.id !== product.id)
    .slice(0, 5);

  const currencySymbol = settings.currency_symbol || '₹';

  return (
    <StorefrontShell>
      <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-8 lg:px-10 sm:py-8">
        {/* Minimal Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-xs font-normal text-neutral-400">
          <Link href="/" className="hover:text-[#111111] transition-colors">
            Home
          </Link>
          <span>/</span>
          {product.category ? (
            <>
              <Link
                href={`/categories/${product.category.slug}`}
                className="hover:text-[#111111] transition-colors"
              >
                {product.category.name}
              </Link>
              <span>/</span>
            </>
          ) : (
            <>
              <Link href="/shop" className="hover:text-[#111111] transition-colors">
                Shop
              </Link>
              <span>/</span>
            </>
          )}
          <span className="truncate text-neutral-600">{product.name}</span>
        </div>

        <ProductDetailClient
          product={product}
          currencySymbol={currencySymbol}
        />
      </div>

      {relatedProducts.length > 0 && (
        <ProductGridSection
          title="YOU MAY ALSO LIKE"
          products={relatedProducts}
          viewAllHref={
            product.category
              ? `/categories/${product.category.slug}`
              : '/shop'
          }
          currencySymbol={currencySymbol}
        />
      )}
    </StorefrontShell>
  );
}

