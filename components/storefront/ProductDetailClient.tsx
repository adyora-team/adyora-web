'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag, ShieldCheck, Truck, RotateCcw, Plus, Minus } from 'lucide-react';
import type { Product } from '@/types/database';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';
import { useStore } from './StoreContext';

interface ProductDetailClientProps {
  product: Product;
  currencySymbol?: string;
}

export function ProductDetailClient({
  product,
  currencySymbol = '₹',
}: ProductDetailClientProps) {
  const router = useRouter();
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const wishlisted = isWishlisted(product.id);

  const images = product.product_images || [];
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  const availableSizes =
    Array.isArray(product.sizes) && product.sizes.length > 0
      ? product.sizes
      : ['S', 'M', 'L', 'XL'];

  const availableColours =
    Array.isArray(product.colours) && product.colours.length > 0
      ? product.colours
      : [];

  const [selectedSize, setSelectedSize] = useState<string>(availableSizes[0] || '');
  const [selectedColour, setSelectedColour] = useState<string>(
    availableColours[0]?.name || ''
  );
  const [quantity, setQuantity] = useState<number>(1);

  // Match variant if product_variants exist
  const matchingVariant = (product.product_variants || []).find(
    (v) =>
      v.is_active &&
      (!selectedSize || v.size === selectedSize) &&
      (!selectedColour || v.colour_name === selectedColour)
  );

  const effectivePrice =
    matchingVariant?.selling_price_override ?? Number(product.selling_price);
  const effectiveStock =
    matchingVariant !== undefined
      ? matchingVariant.stock_quantity
      : product.stock_quantity;
  const effectiveSku = matchingVariant?.sku || product.sku;

  const hasDiscount =
    product.original_price !== null &&
    Number(product.original_price) > effectivePrice;

  const discountPercentage = hasDiscount
    ? Math.round(
        ((Number(product.original_price) - effectivePrice) /
          Number(product.original_price)) *
          100
      )
    : 0;

  const activeImage = images[selectedImageIdx] || images[0];

  const handleAddToBag = (redirectCheckout = false) => {
    if (effectiveStock <= 0) return;
    addToCart({
      productId: product.id,
      variantId: matchingVariant?.id || null,
      name: product.name,
      slug: product.slug,
      sku: effectiveSku,
      price: effectivePrice,
      originalPrice: product.original_price ? Number(product.original_price) : null,
      imageUrl: activeImage?.image_url || '',
      size: selectedSize,
      colour: selectedColour,
      quantity,
      maxStock: effectiveStock,
    });
    if (redirectCheckout) {
      router.push('/checkout');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
      {/* Left: Image Gallery (7 cols) */}
      <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-3.5">
        {images.length > 1 && (
          <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:w-20 flex-shrink-0">
            {images.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelectedImageIdx(idx)}
                className={`relative aspect-[4/5] w-16 sm:w-20 flex-shrink-0 overflow-hidden bg-[#F4F4F4] border-2 transition ${
                  idx === selectedImageIdx
                    ? 'border-[#080808]'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={getOptimizedCloudinaryUrl(img.image_url, {
                    width: 400,
                    crop: 'pad',
                  })}
                  alt={img.alt_text || `${product.name} thumbnail ${idx + 1}`}
                  className="h-full w-full object-contain object-center"
                />
              </button>
            ))}
          </div>
        )}

        <div className="relative aspect-[3/4] w-full flex-1 overflow-hidden bg-[#EFEFEF]">
          {activeImage?.image_url ? (
            <img
              src={getOptimizedCloudinaryUrl(activeImage.image_url, {
                width: 800,
              })}
              alt={activeImage.alt_text || product.name}
              decoding="async"
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase tracking-widest text-neutral-400">
              {product.name}
            </div>
          )}

          {hasDiscount && discountPercentage > 0 && (
            <span className="absolute left-4 top-4 bg-[#080808] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white">
              -{discountPercentage}% OFF
            </span>
          )}
        </div>
      </div>

      {/* Right: Product Information & Purchase Controls (5 cols) */}
      <div className="lg:col-span-5 flex flex-col">
        {product.category && (
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0066FF]">
            {product.category.name}
          </p>
        )}

        <h1 className="mt-1.5 text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#080808]">
          {product.name}
        </h1>

        <p className="mt-1 text-[11px] text-neutral-400 uppercase tracking-wider">
          SKU: {effectiveSku}
        </p>

        {/* Pricing */}
        <div className="mt-4 flex items-baseline gap-3 border-b border-[#E5E5E5] pb-5">
          <span className="text-2xl font-black text-[#080808]">
            {currencySymbol}
            {effectivePrice.toLocaleString('en-IN')}
          </span>
          {hasDiscount && (
            <>
              <span className="text-sm text-neutral-400 line-through">
                {currencySymbol}
                {Number(product.original_price).toLocaleString('en-IN')}
              </span>
              <span className="bg-[#0066FF]/10 px-2 py-0.5 text-xs font-extrabold text-[#0066FF]">
                SAVE {discountPercentage}%
              </span>
            </>
          )}
        </div>

        {/* Colour Selector */}
        {availableColours.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#080808]">
                Colour: <span className="font-normal text-neutral-600">{selectedColour}</span>
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              {availableColours.map((col, idx) => {
                const isSelected = selectedColour === col.name;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedColour(col.name)}
                    className={`flex items-center gap-2 border px-3 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? 'border-[#080808] bg-[#080808] text-white'
                        : 'border-[#E5E5E5] bg-white text-[#080808] hover:border-[#080808]'
                    }`}
                  >
                    <span
                      style={{ backgroundColor: col.hex || '#080808' }}
                      className="h-3.5 w-3.5 rounded-full border border-neutral-300"
                    />
                    <span>{col.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Size Selector */}
        {availableSizes.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#080808]">
                Select Size
              </span>
              <span className="text-[11px] font-semibold text-neutral-500">
                Contemporary Relaxed Fit
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-5 gap-2">
              {availableSizes.map((size) => {
                const isSelected = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`py-2.5 text-xs font-extrabold uppercase tracking-wider border transition ${
                      isSelected
                        ? 'border-[#080808] bg-[#080808] text-white'
                        : 'border-[#E5E5E5] bg-white text-[#080808] hover:border-[#080808]'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantity & Stock Status */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center border border-[#E5E5E5]">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3.5 py-2.5 text-neutral-600 hover:bg-[#F4F4F4]"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-4 text-xs font-bold">{quantity}</span>
            <button
              type="button"
              onClick={() =>
                setQuantity((q) => Math.min(Math.max(1, effectiveStock), q + 1))
              }
              className="px-3.5 py-2.5 text-neutral-600 hover:bg-[#F4F4F4]"
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              effectiveStock > 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {effectiveStock > 5
              ? 'In Stock'
              : effectiveStock > 0
              ? `Only ${effectiveStock} Left`
              : 'Out of Stock'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex gap-3">
            <button
              type="button"
              disabled={effectiveStock <= 0}
              onClick={() => handleAddToBag(false)}
              className="flex flex-1 items-center justify-center gap-2 bg-[#080808] py-4 text-xs font-extrabold uppercase tracking-[0.14em] text-white transition hover:bg-[#0066FF] disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>{effectiveStock > 0 ? 'Add to Bag' : 'Sold Out'}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              aria-label="Toggle wishlist"
              className="flex w-14 items-center justify-center border border-[#E5E5E5] bg-white text-[#080808] hover:border-[#080808]"
            >
              <Heart
                className={`h-5 w-5 ${
                  wishlisted ? 'fill-[#080808] text-[#080808]' : ''
                }`}
              />
            </button>
          </div>

          {effectiveStock > 0 && (
            <button
              type="button"
              onClick={() => handleAddToBag(true)}
              className="w-full border border-[#080808] bg-white py-3.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#080808] transition hover:bg-[#F4F4F4]"
            >
              Buy It Now
            </button>
          )}
        </div>

        {/* Product Description */}
        {product.description && (
          <div className="mt-8 border-t border-[#E5E5E5] pt-6">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#080808]">
              Product Details
            </h2>
            <div className="mt-2.5 whitespace-pre-line text-xs leading-relaxed text-neutral-600">
              {product.description}
            </div>
          </div>
        )}

        {/* Store Guarantees */}
        <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[#E5E5E5] pt-6 text-center">
          <div className="flex flex-col items-center gap-1.5 bg-[#F4F4F4]/60 p-3">
            <Truck className="h-4 w-4 text-[#080808]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Fast Dispatch
            </span>
          </div>
          <div className="flex flex-col items-center gap-1.5 bg-[#F4F4F4]/60 p-3">
            <RotateCcw className="h-4 w-4 text-[#080808]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Easy Exchanges
            </span>
          </div>
          <div className="flex flex-col items-center gap-1.5 bg-[#F4F4F4]/60 p-3">
            <ShieldCheck className="h-4 w-4 text-[#080808]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Secure Checkout
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Add-to-Bag Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E5E5E5] p-3 px-4 flex items-center justify-between gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase font-bold text-neutral-400">Total Price</span>
          <span className="text-sm font-black text-[#080808]">
            {currencySymbol}{effectivePrice.toLocaleString('en-IN')}
          </span>
        </div>
        <button
          type="button"
          disabled={effectiveStock <= 0}
          onClick={() => handleAddToBag(false)}
          className="flex-1 max-w-[200px] flex items-center justify-center gap-2 bg-[#080808] py-3 text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-[#0066FF] disabled:bg-neutral-300"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          <span>{effectiveStock > 0 ? 'Add to Bag' : 'Sold Out'}</span>
        </button>
      </div>
    </div>
  );
}

