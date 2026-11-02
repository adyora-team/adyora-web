'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart,
  Share2,
  ShieldCheck,
  Truck,
  RotateCcw,
  Banknote,
  Plus,
  Minus,
  Pencil,
  Check,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import type { Product } from '@/types/database';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';
import { extractPdpConfig } from '@/lib/pdp-config';
import { useStore } from './StoreContext';

interface ProductDetailClientProps {
  product: Product;
  currencySymbol?: string;
}

/**
 * Converts ALL-CAPS product titles into clean, readable Title Case
 * matching the reference streetwear product detail typography.
 */
function formatDisplayTitle(name: string): string {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  return words
    .map((word) => {
      if (word.toUpperCase() === 'TEE' || word.toUpperCase() === 'T-SHIRT') {
        return 'T-Shirt';
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Strips stray markdown asterisks (**) and separates narrative story,
 * spec attributes, and bullet highlights.
 */
function parseProductDescription(raw: string | undefined) {
  if (!raw) return { storyParagraphs: [], bulletPoints: [], specPills: [] };

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

    const specMatch = line.match(
      /^(Style|Fit|Colour|Color|Fabric|Material|Occasion)\s*:\s*(.+)$/i
    );
    if (specMatch) {
      specPills.push({ label: specMatch[1], value: specMatch[2].trim() });
      continue;
    }

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

  // Extract clean description & per-product PDP display configuration
  const { cleanDescription, pdpConfig } = extractPdpConfig(product.description);
  const { storyParagraphs, bulletPoints, specPills } =
    parseProductDescription(cleanDescription);

  const images = (product.product_images || []).sort(
    (a, b) => a.display_order - b.display_order
  );
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  const availableSizes =
    Array.isArray(product.sizes) && product.sizes.length > 0
      ? product.sizes.filter((s) => s && !/^[*•\-—\s]+$/.test(s.trim()))
      : ['S', 'M', 'L', 'XL'];

  // Filter out any stray '*' or punctuation-only colour artifacts
  const availableColours = Array.isArray(product.colours)
    ? product.colours.filter(
        (c) => c?.name && !/^[*•\-—\s]+$/.test(c.name.trim())
      )
    : [];

  const [selectedSize, setSelectedSize] = useState<string>(
    availableSizes[0] || 'S'
  );
  const [selectedColour, setSelectedColour] = useState<string>(
    availableColours[0]?.name || ''
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<
    'details' | 'specs' | 'shipping' | null
  >('details');
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);

  // Match variant if product_variants exist
  const matchingVariant = (product.product_variants || []).find(
    (v) =>
      (!selectedSize || v.size === selectedSize) &&
      (!selectedColour || v.colour_name === selectedColour)
  );

  const effectivePrice =
    matchingVariant?.selling_price_override !== null &&
    matchingVariant?.selling_price_override !== undefined
      ? Number(matchingVariant.selling_price_override)
      : Number(product.selling_price);

  const effectiveStock = matchingVariant
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
  const displayTitle = formatDisplayTitle(product.name);

  const handleAddToBag = (buyNow = false) => {
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

    if (buyNow) {
      router.push('/checkout');
    }
  };

  const handleShare = async () => {
    const shareUrl =
      typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: displayTitle,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const toggleAccordion = (tab: 'details' | 'specs' | 'shipping') => {
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
      <div className="pb-20">
        {/* ================================================================ */}
        {/* MAIN 2-COLUMN SYNCHRONIZED STICKY STAGE                          */}
        {/* Both columns use lg:sticky so the shorter side pins cleanly      */}
        {/* while the taller side finishes scrolling, matching reference UX. */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 items-start">
          {/* ============================================================== */}
          {/* LEFT COLUMN: EDITORIAL SCROLLABLE IMAGE GALLERY (7 cols)       */}
          {/* Only displays multiple images when multiple photos are added!  */}
          {/* ============================================================== */}
          <div className="lg:col-span-7 lg:sticky lg:top-24">
            {/* Mobile Gallery View */}
            <div className="sm:hidden">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#F4F4F2]">
                {activeImage?.image_url ? (
                  <img
                    src={getOptimizedCloudinaryUrl(activeImage.image_url, {
                      width: 800,
                    })}
                    alt={activeImage.alt_text || displayTitle}
                    decoding="async"
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium text-neutral-400">
                    {displayTitle}
                  </div>
                )}

                {pdpConfig.showNewBadge && product.is_new_arrival && (
                  <span className="absolute left-3.5 top-3.5 rounded-full bg-[#15803D] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                    NEW
                  </span>
                )}
              </div>

              {images.length > 1 && (
                <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {images.map((img, idx) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`relative aspect-[4/5] w-16 flex-shrink-0 overflow-hidden rounded-xl bg-[#F4F4F2] border-2 transition ${
                        idx === selectedImageIdx
                          ? 'border-[#111111] opacity-100'
                          : 'border-transparent opacity-60'
                      }`}
                    >
                      <img
                        src={getOptimizedCloudinaryUrl(img.image_url, {
                          width: 400,
                        })}
                        alt={img.alt_text || `${displayTitle} ${idx + 1}`}
                        className="h-full w-full object-cover object-top"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Editorial Scroll Gallery */}
            <div className="hidden sm:flex sm:flex-col gap-3.5">
              {/* Primary Hero Image Card */}
              <div className="relative aspect-[4/4.6] max-h-[660px] w-full overflow-hidden rounded-2xl bg-[#F4F4F2]">
                {images[0]?.image_url ? (
                  <img
                    src={getOptimizedCloudinaryUrl(images[0].image_url, {
                      width: 1200,
                    })}
                    alt={images[0].alt_text || displayTitle}
                    decoding="async"
                    className="h-full w-full object-cover object-top transition-transform duration-700 ease-out hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-medium text-neutral-400">
                    {displayTitle}
                  </div>
                )}

                {/* Green "NEW" Pill Badge (if enabled for product) */}
                {pdpConfig.showNewBadge && product.is_new_arrival && (
                  <span className="absolute left-4 top-4 rounded-full bg-[#15803D] px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                    NEW
                  </span>
                )}

                {hasDiscount && discountPercentage > 0 && (
                  <span className="absolute right-4 top-4 rounded-full bg-[#111111] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                    -{discountPercentage}% OFF
                  </span>
                )}
              </div>

              {/* Extra Images Grid: ONLY shown if admin uploaded multiple photos */}
              {images.length > 1 && (
                <div className="grid grid-cols-2 gap-3.5">
                  {images.slice(1).map((img, idx) => (
                    <div
                      key={img.id}
                      className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[#F4F4F2]"
                    >
                      <img
                        src={getOptimizedCloudinaryUrl(img.image_url, {
                          width: 800,
                        })}
                        alt={img.alt_text || `${displayTitle} view ${idx + 2}`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover object-top transition-transform duration-700 ease-out hover:scale-[1.04]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN: PRODUCT DETAILS & PURCHASE CONTROLS (5 cols)     */}
          {/* ============================================================== */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 flex flex-col">
            {/* 1. Title + Wishlist & Share Actions */}
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-xl sm:text-[22px] font-semibold text-[#111111] leading-snug tracking-[-0.01em]">
                {displayTitle}
              </h1>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  aria-label="Add to wishlist"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 hover:text-[#111111]"
                >
                  <Heart
                    className={`h-[18px] w-[18px] ${
                      wishlisted
                        ? 'fill-[#E11D48] text-[#E11D48]'
                        : 'text-neutral-600'
                    }`}
                    strokeWidth={1.8}
                  />
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share product"
                  className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F4F6] text-neutral-700 transition hover:bg-neutral-200"
                >
                  <Share2 className="h-4 w-4" strokeWidth={1.8} />
                  {copiedShare && (
                    <span className="absolute -bottom-7 right-0 whitespace-nowrap rounded bg-[#111111] px-2 py-0.5 text-[10px] font-medium text-white shadow">
                      Copied!
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Price, Tax Notice & Stock Indicator */}
            <div className="mt-2.5 border-b border-neutral-100 pb-4">
              <div className="flex items-baseline gap-2.5">
                <span className="text-xl sm:text-[22px] font-bold text-[#111111] tracking-tight">
                  {currencySymbol} {effectivePrice.toLocaleString('en-IN')}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-sm text-neutral-400 line-through font-normal">
                      {currencySymbol}
                      {Number(product.original_price).toLocaleString('en-IN')}
                    </span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                      {discountPercentage}% OFF
                    </span>
                  </>
                )}
              </div>

              <p className="mt-0.5 text-[11px] text-neutral-400 font-normal">
                Inclusive of all Taxes
              </p>

              <p
                className={`mt-1 text-xs font-semibold ${
                  effectiveStock > 0 ? 'text-[#581C87]' : 'text-red-600'
                }`}
              >
                {effectiveStock > 0 ? 'In stock' : 'Out of stock'}
              </p>
            </div>

            {/* 3. Rounded Gray Box: Select Size + Optional Size Guide + Quantity Counter */}
            <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-600">
                  SELECT SIZE
                </span>
                {pdpConfig.showSizeGuide && (
                  <button
                    type="button"
                    onClick={() => setShowSizeGuide(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#111111] underline underline-offset-2 hover:text-neutral-600 transition"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Size Guide</span>
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                {/* Size Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {availableSizes.map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`h-[38px] min-w-[42px] px-3 rounded-lg border text-xs font-medium transition flex items-center justify-center ${
                          isSelected
                            ? 'border-[#111111] bg-[#111111] text-white font-semibold shadow-sm'
                            : 'border-[#E5E7EB] bg-white text-[#111111] hover:border-neutral-400'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>

                {/* Quantity Stepper inside the same gray card */}
                <div className="flex h-[38px] min-w-[100px] items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-2.5">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-1 text-neutral-600 hover:text-[#111111] transition"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="px-2 text-xs font-semibold text-[#111111]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) =>
                        Math.min(Math.max(1, effectiveStock), q + 1)
                      )
                    }
                    className="p-1 text-neutral-600 hover:text-[#111111] transition"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Select Color */}
            {availableColours.length > 0 && (
              <div className="mt-4">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-neutral-600">
                  SELECT COLOR
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {availableColours.map((col, idx) => {
                    const isSelected = selectedColour === col.name;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedColour(col.name)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                          isSelected
                            ? 'border-[#111111] bg-[#111111] text-white shadow-sm'
                            : 'border-[#E5E7EB] bg-white text-[#111111] hover:border-neutral-400'
                        }`}
                      >
                        <span
                          style={{ backgroundColor: col.hex || '#111111' }}
                          className="h-3 w-3 rounded-full border border-neutral-300"
                        />
                        <span>{col.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Shop With Confidence + Side-by-Side ADD TO CART & BUY NOW */}
            <div className="mt-5">
              <div className="mb-2.5 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#1F2937]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1F2937]">
                  SHOP WITH CONFIDENCE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={effectiveStock <= 0}
                  onClick={() => handleAddToBag(false)}
                  className="h-12 w-full rounded-lg bg-[#F5E0A3] hover:bg-[#ecd387] text-[#3B331E] text-xs font-semibold uppercase tracking-wider transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {effectiveStock > 0 ? 'ADD TO CART' : 'SOLD OUT'}
                </button>

                <button
                  type="button"
                  disabled={effectiveStock <= 0}
                  onClick={() => handleAddToBag(true)}
                  className="h-12 w-full rounded-lg bg-[#F5E0A3] hover:bg-[#ecd387] text-[#3B331E] text-xs font-semibold uppercase tracking-wider transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  BUY NOW
                </button>
              </div>
            </div>

            {/* 6. Promo Banner Card (Only shown when enabled for this product in Admin) */}
            {pdpConfig.showPromoBanner && (
              <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[#F3E5AB] bg-[#FFFDF5] p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#3B331E]">
                    {pdpConfig.promoTitle || 'BUY MORE. SAVE MORE.'}
                  </p>
                  <p className="mt-1 text-xs text-[#6B5E3C] font-normal leading-relaxed">
                    {pdpConfig.promoText}
                  </p>
                </div>
                {pdpConfig.promoBadge && (
                  <span className="flex-shrink-0 rounded-full bg-[#FACC15] px-3.5 py-1.5 text-[11px] font-bold text-[#111111]">
                    {pdpConfig.promoBadge}
                  </span>
                )}
              </div>
            )}

            {/* 7. 3-Feature Trust Strip (Only shown when enabled in Admin) */}
            {pdpConfig.showTrustBadges &&
              (pdpConfig.showCodBadge ||
                pdpConfig.showFreeShippingBadge ||
                pdpConfig.showEasyReturnsBadge) && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#111111]">
                  {pdpConfig.showCodBadge && (
                    <div className="flex items-center gap-1.5">
                      <Banknote className="h-4 w-4 text-emerald-600" />
                      <span>CASH ON DELIVERY</span>
                    </div>
                  )}
                  {pdpConfig.showFreeShippingBadge && (
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-amber-500" />
                      <span>FREE SHIPPING</span>
                    </div>
                  )}
                  {pdpConfig.showEasyReturnsBadge && (
                    <div className="flex items-center gap-1.5">
                      <RotateCcw className="h-4 w-4 text-sky-600" />
                      <span>EASY RETURNS</span>
                    </div>
                  )}
                </div>
              )}

            {/* 8. "Choose how you pay" Comparison Box (Only shown when enabled in Admin) */}
            {pdpConfig.showPaymentComparison && (
              <div className="mt-4 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-xs font-semibold text-[#111111]">
                  Choose how you pay
                </div>

                {/* Online Payment Row */}
                <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F0FDF4] px-4 py-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#111111]">
                        Pay Online — UPI / Card
                      </span>
                      <span className="rounded-full bg-[#15803D] px-2 py-0.5 text-[9px] font-bold uppercase text-white">
                        BEST PRICE
                      </span>
                    </div>
                    {pdpConfig.onlineSavingsAmount > 0 && (
                      <p className="mt-0.5 text-[11px] font-semibold text-[#15803D]">
                        You save {currencySymbol}{' '}
                        {pdpConfig.onlineSavingsAmount}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-[#15803D]">
                    {currencySymbol} {effectivePrice.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Cash on Delivery Row */}
                <div className="flex items-center justify-between bg-white px-4 py-3.5">
                  <div>
                    <span className="text-xs font-semibold text-[#111111]">
                      Cash on Delivery
                    </span>
                    <p className="mt-0.5 text-[11px] text-neutral-400 font-normal">
                      {pdpConfig.codFeeMin === pdpConfig.codFeeMax
                        ? `Includes ${currencySymbol} ${pdpConfig.codFeeMin} COD fee`
                        : `Includes ${currencySymbol} ${pdpConfig.codFeeMin}–${currencySymbol} ${pdpConfig.codFeeMax} COD fee`}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#111111]">
                    {pdpConfig.codFeeMin === pdpConfig.codFeeMax ? (
                      <>
                        {currencySymbol}{' '}
                        {(
                          effectivePrice + Number(pdpConfig.codFeeMin || 0)
                        ).toLocaleString('en-IN')}
                      </>
                    ) : (
                      <>
                        {currencySymbol}{' '}
                        {(
                          effectivePrice + Number(pdpConfig.codFeeMin || 0)
                        ).toLocaleString('en-IN')}{' '}
                        – {currencySymbol}{' '}
                        {(
                          effectivePrice + Number(pdpConfig.codFeeMax || 0)
                        ).toLocaleString('en-IN')}
                      </>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* 9. "Check for Delivery Details" Pincode Box (Only shown when enabled in Admin) */}
            {pdpConfig.showPincodeChecker && (
              <form
                onSubmit={handleCheckPincode}
                className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4"
              >
                <label className="block text-xs font-semibold text-[#111111] mb-2.5">
                  Check for Delivery Details
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={pincodeInput}
                    onChange={(e) =>
                      setPincodeInput(e.target.value.replace(/[^0-9]/g, ''))
                    }
                    placeholder="Enter delivery pincode"
                    className="h-10 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3.5 text-xs text-[#111111] placeholder:text-neutral-400 focus:border-[#111111] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="h-10 rounded-lg bg-[#1E293B] hover:bg-[#0F172A] px-5 text-xs font-semibold text-white transition"
                  >
                    Check
                  </button>
                </div>
                {pincodeStatus && (
                  <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-[#15803D]">
                    <Check className="h-3.5 w-3.5" />
                    <span>
                      Express delivery available to {pincodeStatus} • Dispatch
                      in 24–48 hrs.
                    </span>
                  </p>
                )}
              </form>
            )}

            {/* 10. Clean Collapsible Product Details & Specifications */}
            <div className="mt-5 divide-y divide-[#E5E7EB] rounded-xl border border-[#E5E7EB] bg-white px-4">
              {/* Accordion 1: Product Description & Highlights */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('details')}
                  className="flex w-full items-center justify-between py-3.5 text-left text-xs font-semibold text-[#111111]"
                >
                  <span>Product Details & Highlights</span>
                  {openAccordion === 'details' ? (
                    <ChevronUp className="h-4 w-4 text-neutral-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-neutral-500" />
                  )}
                </button>

                {openAccordion === 'details' && (
                  <div className="pb-4 space-y-3 text-xs leading-relaxed text-neutral-600 font-normal">
                    {storyParagraphs.length > 0 && (
                      <div className="space-y-2">
                        {storyParagraphs.map((para, idx) => (
                          <p key={idx}>{para}</p>
                        ))}
                      </div>
                    )}

                    {specPills.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {specPills.map((pill, idx) => (
                          <span
                            key={idx}
                            className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-[11px] font-medium text-[#111111]"
                          >
                            <span className="text-neutral-400 mr-1">
                              {pill.label}:
                            </span>
                            {pill.value}
                          </span>
                        ))}
                      </div>
                    )}

                    {bulletPoints.length > 0 && (
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {bulletPoints.map((bullet, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-neutral-600"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#111111]" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <p className="text-[11px] text-neutral-400 pt-1">
                      SKU: {effectiveSku}
                    </p>
                  </div>
                )}
              </div>

              {/* Accordion 2: Fabric & Care */}
              {pdpConfig.showFabricAccordion && (
                <div>
                  <button
                    type="button"
                    onClick={() => toggleAccordion('specs')}
                    className="flex w-full items-center justify-between py-3.5 text-left text-xs font-semibold text-[#111111]"
                  >
                    <span>Fabric & Silhouette Specifications</span>
                    {openAccordion === 'specs' ? (
                      <ChevronUp className="h-4 w-4 text-neutral-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-neutral-500" />
                    )}
                  </button>
                  {openAccordion === 'specs' && (
                    <div className="pb-4 text-xs text-neutral-600 leading-relaxed space-y-1.5 font-normal">
                      {(pdpConfig.fabricSpecsText || '')
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Accordion 3: Shipping & Returns */}
              {pdpConfig.showShippingAccordion && (
                <div>
                  <button
                    type="button"
                    onClick={() => toggleAccordion('shipping')}
                    className="flex w-full items-center justify-between py-3.5 text-left text-xs font-semibold text-[#111111]"
                  >
                    <span>Shipping, Returns & Exchanges</span>
                    {openAccordion === 'shipping' ? (
                      <ChevronUp className="h-4 w-4 text-neutral-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-neutral-500" />
                    )}
                  </button>
                  {openAccordion === 'shipping' && (
                    <div className="pb-4 text-xs text-neutral-600 leading-relaxed space-y-1.5 font-normal">
                      {(pdpConfig.shippingSpecsText || '')
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* BOTTOM STICKY BAR                                                */}
      {/* ================================================================ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E5E7EB] bg-white/95 backdrop-blur-md px-4 sm:px-8 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
            <p className="truncate text-xs font-semibold text-[#111111]">
              {displayTitle}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
              <span>Size:</span>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                aria-label="Select size"
                className="rounded bg-[#111111] px-2 py-0.5 text-[11px] font-semibold text-white focus:outline-none"
              >
                {availableSizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={effectiveStock <= 0}
            onClick={() => handleAddToBag(false)}
            className="rounded-md bg-[#080808] hover:bg-[#222222] px-6 sm:px-10 py-2.5 text-xs font-semibold text-white transition active:scale-[0.99] disabled:bg-neutral-300"
          >
            {effectiveStock > 0 ? 'Add to Cart' : 'Sold Out'}
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* SIZE GUIDE MODAL (Only accessible if Size Guide is Active)       */}
      {/* ================================================================ */}
      {pdpConfig.showSizeGuide && showSizeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            className="fixed inset-0"
            onClick={() => setShowSizeGuide(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl text-[#111111]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  SIZE & MEASUREMENT GUIDE
                </p>
                <h3 className="mt-1 text-base font-bold text-[#111111]">
                  Contemporary Boxy Streetwear Fit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSizeGuide(false)}
                className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-[#111111]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-xs text-neutral-600 leading-relaxed font-normal">
              All ADYORA garments are tailored in a{' '}
              <strong>relaxed contemporary silhouette</strong>. Measurements
              below are in inches.
            </p>

            <div className="mt-4 overflow-x-auto rounded-xl border border-[#E5E7EB]">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-[11px] font-semibold uppercase tracking-wider text-[#111111]">
                    <th className="py-2.5 px-3 text-left">Size</th>
                    <th className="py-2.5 px-3">Chest</th>
                    <th className="py-2.5 px-3">Length</th>
                    <th className="py-2.5 px-3">Shoulder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] font-normal text-neutral-700">
                  <tr>
                    <td className="py-2 px-3 text-left font-semibold text-[#111111]">
                      S
                    </td>
                    <td className="py-2 px-3">40&quot;–42&quot;</td>
                    <td className="py-2 px-3">28&quot;</td>
                    <td className="py-2 px-3">20.5&quot;</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-left font-semibold text-[#111111]">
                      M
                    </td>
                    <td className="py-2 px-3">42&quot;–44&quot;</td>
                    <td className="py-2 px-3">29&quot;</td>
                    <td className="py-2 px-3">21.5&quot;</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-left font-semibold text-[#111111]">
                      L
                    </td>
                    <td className="py-2 px-3">44&quot;–46&quot;</td>
                    <td className="py-2 px-3">30&quot;</td>
                    <td className="py-2 px-3">22.5&quot;</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-left font-semibold text-[#111111]">
                      XL
                    </td>
                    <td className="py-2 px-3">46&quot;–48&quot;</td>
                    <td className="py-2 px-3">31&quot;</td>
                    <td className="py-2 px-3">23.5&quot;</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-left font-semibold text-[#111111]">
                      2XL
                    </td>
                    <td className="py-2 px-3">48&quot;–50&quot;</td>
                    <td className="py-2 px-3">32&quot;</td>
                    <td className="py-2 px-3">24.5&quot;</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 border-t border-[#E5E7EB] pt-3 text-[11px] text-neutral-500">
              <p>
                <strong>Styling Note:</strong> Select your regular size for a
                relaxed boxy fit, or size down for a closer fit.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
