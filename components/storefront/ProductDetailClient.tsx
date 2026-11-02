'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart,
  ShoppingBag,
  ShieldCheck,
  Truck,
  RotateCcw,
  Plus,
  Minus,
  Ruler,
  MapPin,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
} from 'lucide-react';
import type { Product } from '@/types/database';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';
import { useStore } from './StoreContext';

interface ProductDetailClientProps {
  product: Product;
  currencySymbol?: string;
}

function parseProductDescription(raw: string | undefined) {
  if (!raw) return { storyParagraphs: [], bulletPoints: [], specPills: [] };

  // 1. Strip stray asterisks, markdown bold headers, and clean line endings
  const sanitized = raw
    .replace(/^(\s*\*+\s*)+/gm, '')
    .replace(/(\s*\*+\s*)+$/gm, '')
    .replace(/\*\*Details:\*\*/gi, 'Details:')
    .trim();

  const lines = sanitized.split('\n').map((l) => l.trim());

  const storyParagraphs: string[] = [];
  const bulletPoints: string[] = [];
  const specPills: Array<{ label: string; value: string }> = [];

  let inDetails = false;
  let currentStoryPara = '';

  for (const line of lines) {
    if (!line) {
      if (currentStoryPara) {
        storyParagraphs.push(currentStoryPara);
        currentStoryPara = '';
      }
      continue;
    }

    if (/^Details\s*:/i.test(line)) {
      if (currentStoryPara) {
        storyParagraphs.push(currentStoryPara);
        currentStoryPara = '';
      }
      inDetails = true;
      continue;
    }

    // Check if line is a spec attribute (e.g., "Style: Minimalist Streetwear", "Fit: Relaxed", "Colour: Beige")
    const specMatch = line.match(
      /^(Style|Fit|Colour|Color|Fabric|Material|Occasion)\s*:\s*(.+)$/i
    );
    if (specMatch) {
      specPills.push({ label: specMatch[1], value: specMatch[2].trim() });
      continue;
    }

    // Check if line is a bullet item (starts with •, -, *, or is inside inDetails)
    if (/^[-*•]\s*/.test(line) || (inDetails && !line.includes(':'))) {
      const cleanBullet = line.replace(/^[-*•]\s*/, '').trim();
      if (cleanBullet) bulletPoints.push(cleanBullet);
    } else {
      if (inDetails) {
        bulletPoints.push(line);
      } else {
        currentStoryPara = currentStoryPara
          ? `${currentStoryPara} ${line}`
          : line;
      }
    }
  }

  if (currentStoryPara) {
    storyParagraphs.push(currentStoryPara);
  }

  return { storyParagraphs, bulletPoints, specPills };
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

  const [selectedSize, setSelectedSize] = useState<string>(
    availableSizes[0] || ''
  );
  const [selectedColour, setSelectedColour] = useState<string>(
    availableColours[0]?.name || ''
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<
    'specs' | 'shipping' | 'returns' | null
  >('specs');
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);

  // Parse and sanitize product description
  const { storyParagraphs, bulletPoints, specPills } = parseProductDescription(
    product.description
  );

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
      originalPrice: product.original_price
        ? Number(product.original_price)
        : null,
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

  const toggleAccordion = (tab: 'specs' | 'shipping' | 'returns') => {
    setOpenAccordion((prev) => (prev === tab ? null : tab));
  };

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (pincodeInput.trim().length === 6) {
      setPincodeStatus(pincodeInput.trim());
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-14">
        {/* Left: Image Gallery (7 cols) */}
        <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
          {images.length > 1 && (
            <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:w-20 flex-shrink-0 scrollbar-none pb-1 sm:pb-0">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedImageIdx(idx)}
                  className={`relative aspect-[3/4] w-16 sm:w-20 flex-shrink-0 overflow-hidden bg-[#EFEFEF] border-2 transition ${
                    idx === selectedImageIdx
                      ? 'border-[#080808] opacity-100 ring-1 ring-[#080808]'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={getOptimizedCloudinaryUrl(img.image_url, {
                      width: 400,
                    })}
                    alt={img.alt_text || `${product.name} thumbnail ${idx + 1}`}
                    decoding="async"
                    className="h-full w-full object-cover object-top"
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
                className="h-full w-full object-cover object-top transition-transform duration-700 ease-out"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase tracking-widest text-neutral-400">
                {product.name}
              </div>
            )}

            {hasDiscount && discountPercentage > 0 && (
              <span className="absolute left-4 top-4 bg-[#080808] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow-sm">
                -{discountPercentage}% OFF
              </span>
            )}
          </div>
        </div>

        {/* Right: Product Information & Purchase Controls (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          {product.category && (
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0066FF]" />
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#0066FF]">
                {product.category.name}
              </p>
            </div>
          )}

          <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-[#080808] leading-tight">
            {product.name}
          </h1>

          <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">
            <span>SKU: {effectiveSku}</span>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  effectiveStock > 0
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-red-500'
                }`}
              />
              <span
                className={
                  effectiveStock > 0 ? 'text-emerald-700' : 'text-red-600'
                }
              >
                {effectiveStock > 5
                  ? 'In Stock & Ready to Ship'
                  : effectiveStock > 0
                  ? `Low Stock — Only ${effectiveStock} Left`
                  : 'Sold Out'}
              </span>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="mt-5 flex items-baseline gap-3.5 border-b border-[#E5E5E5] pb-5">
            <span className="text-3xl font-black text-[#080808] tracking-tight">
              {currencySymbol}
              {effectivePrice.toLocaleString('en-IN')}
            </span>
            {hasDiscount && (
              <>
                <span className="text-base text-neutral-400 line-through font-medium">
                  {currencySymbol}
                  {Number(product.original_price).toLocaleString('en-IN')}
                </span>
                <span className="border border-[#0066FF]/30 bg-[#0066FF]/10 px-2.5 py-0.5 text-xs font-black text-[#0066FF] tracking-wider uppercase">
                  Save {discountPercentage}%
                </span>
              </>
            )}
          </div>

          {/* Colour Selector */}
          {availableColours.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#080808]">
                  Colour:{' '}
                  <span className="font-semibold text-neutral-600 ml-1">
                    {selectedColour}
                  </span>
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {availableColours.map((col, idx) => {
                  const isSelected = selectedColour === col.name;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedColour(col.name)}
                      className={`flex items-center gap-2 border px-3.5 py-2 text-xs font-bold transition ${
                        isSelected
                          ? 'border-[#080808] bg-[#080808] text-white shadow-sm'
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

          {/* Size Selector + Size Guide */}
          {availableSizes.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#080808]">
                  Select Size
                </span>
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#0066FF] hover:text-[#080808] transition-colors"
                >
                  <Ruler className="h-3.5 w-3.5" />
                  <span>Size Guide</span>
                </button>
              </div>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {availableSizes.map((size) => {
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`py-3 text-xs font-extrabold uppercase tracking-wider border transition ${
                        isSelected
                          ? 'border-[#080808] bg-[#080808] text-white shadow-sm'
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
          <div className="mt-6 flex items-center justify-between border-t border-[#E5E5E5] pt-6">
            <div className="flex items-center border border-[#E5E5E5] bg-white">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3.5 py-2.5 text-neutral-600 hover:bg-[#F4F4F4] transition"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="px-4 text-xs font-extrabold">{quantity}</span>
              <button
                type="button"
                onClick={() =>
                  setQuantity((q) =>
                    Math.min(Math.max(1, effectiveStock), q + 1)
                  )
                }
                className="px-3.5 py-2.5 text-neutral-600 hover:bg-[#F4F4F4] transition"
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                Free Shipping on Prepaid Orders
              </span>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                type="button"
                disabled={effectiveStock <= 0}
                onClick={() => handleAddToBag(false)}
                className="flex flex-1 items-center justify-center gap-2.5 bg-[#080808] py-4 text-xs font-extrabold uppercase tracking-[0.16em] text-white transition hover:bg-[#0066FF] disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>{effectiveStock > 0 ? 'Add to Bag' : 'Sold Out'}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label="Toggle wishlist"
                className="flex w-14 items-center justify-center border border-[#E5E5E5] bg-white text-[#080808] hover:border-[#080808] transition"
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
                className="w-full border border-[#080808] bg-white py-3.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[#080808] transition hover:bg-[#080808] hover:text-white"
              >
                Buy It Now
              </button>
            )}
          </div>

          {/* Interactive Pincode Delivery Checker */}
          <form
            onSubmit={handleCheckPincode}
            className="mt-6 border border-[#E5E5E5] bg-[#F4F4F4]/60 p-4"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#080808]" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#080808]">
                Check Delivery & COD
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={pincodeInput}
                onChange={(e) =>
                  setPincodeInput(e.target.value.replace(/[^0-9]/g, ''))
                }
                placeholder="Enter 6-digit Pincode"
                className="w-full max-w-[200px] border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-semibold focus:border-[#080808] focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#080808] px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#0066FF] transition"
              >
                Check
              </button>
            </div>
            {pincodeStatus && (
              <p className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <Check className="h-4 w-4" />
                <span>
                  Express dispatch available to {pincodeStatus} • Delivery in
                  2–4 business days.
                </span>
              </p>
            )}
          </form>

          {/* ======================================================== */}
          {/* ULTRA-REFINED PRODUCT DETAILS & STORY SECTION */}
          {/* ======================================================== */}
          <div className="mt-8 border-t border-[#E5E5E5] pt-6 space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#080808]">
                  Product Details & Overview
                </h2>
                <Sparkles className="h-3.5 w-3.5 text-[#0066FF]" />
              </div>

              {/* Editorial Story Paragraphs */}
              {storyParagraphs.length > 0 ? (
                <div className="mt-3 space-y-3 text-xs sm:text-sm leading-relaxed text-neutral-700">
                  {storyParagraphs.map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>
              ) : null}

              {/* Spec Pills (Style, Fit, Colour badges) */}
              {specPills.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {specPills.map((pill, idx) => (
                    <span
                      key={idx}
                      className="border border-[#E5E5E5] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#080808]"
                    >
                      <strong className="text-neutral-400 mr-1.5 font-semibold">
                        {pill.label}:
                      </strong>
                      {pill.value}
                    </span>
                  ))}
                </div>
              )}

              {/* Structured Micro-Bullet Points Grid */}
              {bulletPoints.length > 0 && (
                <div className="mt-5 border-t border-[#E5E5E5] pt-4">
                  <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#080808]">
                    Key Highlights & Construction
                  </h3>
                  <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {bulletPoints.map((bullet, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-neutral-700 font-medium"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#080808]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* ==================================================== */}
            {/* LUXURY ACCORDIONS: SPECS, SHIPPING & EXCHANGES */}
            {/* ==================================================== */}
            <div className="divide-y divide-[#E5E5E5] border-t border-b border-[#E5E5E5]">
              {/* Accordion 1: Specifications & Sizing */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('specs')}
                  className="flex w-full items-center justify-between py-4 text-left text-xs font-extrabold uppercase tracking-wider text-[#080808]"
                >
                  <span>Fabric & Silhouette Specifications</span>
                  {openAccordion === 'specs' ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                {openAccordion === 'specs' && (
                  <div className="pb-4 text-xs text-neutral-600 leading-relaxed space-y-2">
                    <p>
                      • <strong>Silhouette:</strong> Contemporary relaxed
                      streetwear drape designed for effortless styling.
                    </p>
                    <p>
                      • <strong>Fabrication:</strong> Premium heavyweight combed
                      cotton blend for durability and comfort.
                    </p>
                    <p>
                      • <strong>Hardware & Graphics:</strong> High-density
                      metallic-blue signature graphics with reinforced double-needle
                      stitching.
                    </p>
                  </div>
                )}
              </div>

              {/* Accordion 2: Complimentary Shipping */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('shipping')}
                  className="flex w-full items-center justify-between py-4 text-left text-xs font-extrabold uppercase tracking-wider text-[#080808]"
                >
                  <span>Complimentary Shipping & Dispatch</span>
                  {openAccordion === 'shipping' ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                {openAccordion === 'shipping' && (
                  <div className="pb-4 text-xs text-neutral-600 leading-relaxed space-y-2">
                    <p>
                      • <strong>Dispatch Timeline:</strong> Orders are verified
                      and dispatched within 24–48 business hours.
                    </p>
                    <p>
                      • <strong>Free Delivery:</strong> Complimentary express
                      shipping on all prepaid orders nationwide.
                    </p>
                    <p>
                      • <strong>Tracking:</strong> Real-time tracking link
                      delivered via email and WhatsApp upon dispatch.
                    </p>
                  </div>
                )}
              </div>

              {/* Accordion 3: Easy 7-Day Returns */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('returns')}
                  className="flex w-full items-center justify-between py-4 text-left text-xs font-extrabold uppercase tracking-wider text-[#080808]"
                >
                  <span>Easy 7-Day Returns & Size Exchanges</span>
                  {openAccordion === 'returns' ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                {openAccordion === 'returns' && (
                  <div className="pb-4 text-xs text-neutral-600 leading-relaxed space-y-2">
                    <p>
                      • <strong>Hassle-Free Exchanges:</strong> Easy 7-day size
                      exchanges with doorstep courier pickup.
                    </p>
                    <p>
                      • <strong>Condition:</strong> Items must be in original
                      unworn condition with all ADYORA brand tags intact.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Store Guarantees 3-Card Strip */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col items-center gap-1.5 bg-[#F4F4F4]/80 p-3.5">
                <Truck className="h-4 w-4 text-[#080808]" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  Fast Dispatch
                </span>
                <span className="text-[9px] text-neutral-500 font-medium">
                  Express Courier
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 bg-[#F4F4F4]/80 p-3.5">
                <RotateCcw className="h-4 w-4 text-[#080808]" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  7-Day Exchanges
                </span>
                <span className="text-[9px] text-neutral-500 font-medium">
                  Hassle-Free
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 bg-[#F4F4F4]/80 p-3.5">
                <ShieldCheck className="h-4 w-4 text-[#080808]" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  100% Genuine
                </span>
                <span className="text-[9px] text-neutral-500 font-medium">
                  Verified Brand
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Add-to-Bag Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E5E5E5] p-3 px-4 flex items-center justify-between gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold text-neutral-400">
              Total Price
            </span>
            <span className="text-sm font-black text-[#080808]">
              {currencySymbol}
              {effectivePrice.toLocaleString('en-IN')}
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

      {/* ======================================================== */}
      {/* SIZE GUIDE MODAL */}
      {/* ======================================================== */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            className="fixed inset-0"
            onClick={() => setShowSizeGuide(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-white p-6 shadow-2xl text-[#080808]">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#0066FF]">
                  SIZE & MEASUREMENT GUIDE
                </p>
                <h3 className="mt-1 text-lg font-black uppercase tracking-tight">
                  ADYORA Contemporary Sizing
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSizeGuide(false)}
                className="p-1 text-neutral-400 hover:text-[#080808]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-xs text-neutral-600 leading-relaxed">
              All ADYORA garments are tailored in a <strong>relaxed contemporary streetwear silhouette</strong>. Measurements below are in inches.
            </p>

            <div className="mt-4 overflow-x-auto border border-[#E5E5E5]">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr className="bg-[#F4F4F4] text-[11px] font-extrabold uppercase tracking-wider text-[#080808] border-b border-[#E5E5E5]">
                    <th className="py-2.5 px-3 text-left">Size</th>
                    <th className="py-2.5 px-3">Chest</th>
                    <th className="py-2.5 px-3">Length</th>
                    <th className="py-2.5 px-3">Shoulder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5] font-semibold text-neutral-700">
                  <tr>
                    <td className="py-2 px-3 text-left font-bold text-[#080808]">
                      S
                    </td>
                    <td className="py-2 px-3">40&quot;–42&quot;</td>
                    <td className="py-2 px-3">28&quot;</td>
                    <td className="py-2 px-3">20.5&quot;</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-left font-bold text-[#080808]">
                      M
                    </td>
                    <td className="py-2 px-3">42&quot;–44&quot;</td>
                    <td className="py-2 px-3">29&quot;</td>
                    <td className="py-2 px-3">21.5&quot;</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-left font-bold text-[#080808]">
                      L
                    </td>
                    <td className="py-2 px-3">44&quot;–46&quot;</td>
                    <td className="py-2 px-3">30&quot;</td>
                    <td className="py-2 px-3">22.5&quot;</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-left font-bold text-[#080808]">
                      XL
                    </td>
                    <td className="py-2 px-3">46&quot;–48&quot;</td>
                    <td className="py-2 px-3">31&quot;</td>
                    <td className="py-2 px-3">23.5&quot;</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-left font-bold text-[#080808]">
                      XXL
                    </td>
                    <td className="py-2 px-3">48&quot;–50&quot;</td>
                    <td className="py-2 px-3">32&quot;</td>
                    <td className="py-2 px-3">24.5&quot;</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 border-t border-[#E5E5E5] pt-3 text-[11px] text-neutral-500">
              <p>
                <strong>Styling Note:</strong> For a bold oversized look, select your usual size. For a closer tailored fit, consider sizing one down.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

