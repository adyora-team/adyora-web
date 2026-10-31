import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Product } from '@/types/database';
import { ProductCard } from './ProductCard';

interface ProductGridSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllHref?: string;
  currencySymbol?: string;
  backgroundColor?: string;
  textColor?: string;
}

export function ProductGridSection({
  title,
  subtitle,
  products,
  viewAllHref = '/shop',
  currencySymbol = '₹',
  backgroundColor = '#FFFFFF',
  textColor = '#080808',
}: ProductGridSectionProps) {
  return (
    <section
      style={{ backgroundColor, color: textColor }}
      className="py-10 sm:py-12 md:py-14 border-t border-[#E5E5E5]/60"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-6 sm:mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>
            )}
            <div className="mt-2 h-[2px] w-8 bg-neutral-300" />
          </div>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] hover:text-[#0066FF] transition-colors"
            >
              <span>VIEW ALL</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {/* Product Grid: 2 cols on mobile, 5 cols on desktop matching reference */}
        {products.length === 0 ? (
          <div className="border border-[#E5E5E5] bg-[#F4F4F4]/40 py-14 px-6 text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#080808]">
              Collection Drops Coming Soon
            </p>
            <p className="mt-1.5 text-xs text-neutral-500">
              Add and publish products in the ADYORA Admin Dashboard (/admin/products) to display them here.
            </p>
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
    </section>
  );
}

