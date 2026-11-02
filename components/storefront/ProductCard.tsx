'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag } from 'lucide-react';
import type { Product } from '@/types/database';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';
import { useStore } from './StoreContext';

interface ProductCardProps {
  product: Product;
  currencySymbol?: string;
}

export function ProductCard({ product, currencySymbol = '₹' }: ProductCardProps) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const wishlisted = isWishlisted(product.id);

  const images = (product.product_images || []).sort(
    (a, b) => a.display_order - b.display_order
  );
  const primaryImage = images[0];
  const secondaryImage = images[1];

  const primaryImageUrl = primaryImage?.image_url
    ? getOptimizedCloudinaryUrl(primaryImage.image_url, {
        width: 800,
      })
    : '';

  const secondaryImageUrl = secondaryImage?.image_url
    ? getOptimizedCloudinaryUrl(secondaryImage.image_url, {
        width: 800,
      })
    : '';

  const hasDiscount =
    product.original_price !== null &&
    product.original_price > product.selling_price;

  const discountPercentage = hasDiscount
    ? Math.round(
        (((product.original_price as number) - product.selling_price) /
          (product.original_price as number)) *
          100
      )
    : 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock_quantity <= 0) return;

    addToCart({
      productId: product.id,
      variantId: null,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      price: Number(product.selling_price),
      originalPrice: product.original_price ? Number(product.original_price) : null,
      imageUrl: primaryImage?.image_url || '',
      size: product.sizes?.[0] || 'M',
      colour: product.colours?.[0]?.name || '',
      quantity: 1,
      maxStock: product.stock_quantity || 10,
    });
  };

  return (
    <div className="group flex flex-col">
      {/* Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#EFEFEF]">
        <Link
          href={`/products/${product.slug}`}
          className="relative block h-full w-full overflow-hidden"
        >
          {primaryImageUrl ? (
            <>
              {/* Primary Image */}
              <img
                src={primaryImageUrl}
                alt={primaryImage?.alt_text || product.name}
                loading="lazy"
                decoding="async"
                className={`h-full w-full object-cover object-top transition-all duration-700 ease-out ${
                  secondaryImageUrl
                    ? 'group-hover:scale-105 group-hover:opacity-0'
                    : 'group-hover:scale-105'
                }`}
              />

              {/* Secondary Image: Smooth crossfade transition on hover */}
              {secondaryImageUrl && (
                <img
                  src={secondaryImageUrl}
                  alt={secondaryImage?.alt_text || `${product.name} back view`}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover object-top opacity-0 transition-all duration-700 ease-out group-hover:scale-105 group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#F4F4F4] p-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                {product.name}
              </span>
            </div>
          )}
        </Link>

        {/* Discount Badge (Top-Left) */}
        {hasDiscount && discountPercentage > 0 && (
          <span className="absolute left-2.5 top-2.5 bg-[#080808] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white rounded-sm shadow-sm">
            -{discountPercentage}%
          </span>
        )}

        {/* Wishlist Heart Icon (Top-Right matching reference design) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-[#080808] transition hover:bg-white"
        >
          <Heart
            className={`h-3.5 w-3.5 ${
              wishlisted ? 'fill-[#080808] text-[#080808]' : 'text-[#080808]'
            }`}
            strokeWidth={1.8}
          />
        </button>

        {/* Quick Add Bar */}
        {product.stock_quantity > 0 ? (
          <button
            type="button"
            onClick={handleQuickAdd}
            className="absolute bottom-0 left-0 right-0 flex translate-y-full items-center justify-center gap-1.5 bg-[#080808]/95 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-transform duration-200 group-hover:translate-y-0"
          >
            <ShoppingBag className="h-3 w-3" />
            <span>Quick Add</span>
          </button>
        ) : (
          <div className="absolute bottom-0 left-0 right-0 bg-neutral-900/80 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-white">
            Out of Stock
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="mt-2 sm:mt-2.5 flex flex-col gap-0.5 sm:gap-1">
        <Link
          href={`/products/${product.slug}`}
          className="truncate text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#080808] hover:text-[#0066FF] transition-colors"
        >
          {product.name}
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-[11px] sm:text-xs font-bold text-[#080808]">
            {currencySymbol}
            {Number(product.selling_price).toLocaleString('en-IN')}
          </span>
          {hasDiscount && (
            <>
              <span className="text-[10px] sm:text-[11px] text-neutral-400 line-through font-normal">
                {currencySymbol}
                {Number(product.original_price).toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-[#0066FF]">
                ({discountPercentage}% OFF)
              </span>
            </>
          )}
        </div>

        {/* Available Colour Swatches */}
        {Array.isArray(product.colours) &&
          product.colours.filter(
            (c) => c?.name && !/^[*•\-—\s]+$/.test(c.name.trim())
          ).length > 0 && (
            <div className="mt-0.5 sm:mt-1 flex items-center gap-1 sm:gap-1.5">
              {product.colours
                .filter((c) => c?.name && !/^[*•\-—\s]+$/.test(c.name.trim()))
                .slice(0, 5)
                .map((col, idx) => (
                  <span
                    key={idx}
                    title={col.name}
                    style={{ backgroundColor: col.hex || '#080808' }}
                    className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full border border-neutral-300"
                  />
                ))}
            </div>
          )}
      </div>
    </div>
  );
}

