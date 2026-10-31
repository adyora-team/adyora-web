'use client';

import React from 'react';
import Link from 'next/link';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from './StoreContext';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';

interface CartPageClientProps {
  currencySymbol?: string;
  freeShippingThreshold?: number;
  shippingFlatRate?: number;
}

export function CartPageClient({
  currencySymbol = '₹',
  freeShippingThreshold = 1999,
  shippingFlatRate = 0,
}: CartPageClientProps) {
  const { cart, cartSubtotal, updateQuantity, removeFromCart } = useStore();

  const shippingFee =
    cartSubtotal >= freeShippingThreshold ? 0 : shippingFlatRate;
  const remainingForFreeShipping = Math.max(
    0,
    freeShippingThreshold - cartSubtotal
  );

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-20 px-4 text-center">
        <ShoppingBag className="mx-auto h-14 w-14 stroke-[1.2] text-neutral-300" />
        <h1 className="mt-4 text-2xl font-black uppercase tracking-tight text-[#080808]">
          Your Shopping Bag Is Empty
        </h1>
        <p className="mt-2 text-xs text-neutral-500">
          Looks like you haven&apos;t added any items to your bag yet.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex items-center gap-2 bg-[#080808] px-8 py-3.5 text-xs font-extrabold uppercase tracking-[0.14em] text-white transition hover:bg-[#0066FF]"
        >
          <span>Shop Collection</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 md:py-12">
      <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#080808]">
        Shopping Bag
      </h1>

      {freeShippingThreshold > 0 && (
        <div className="mt-4 border border-[#E5E5E5] bg-[#F4F4F4]/60 px-4 py-3 text-xs">
          {remainingForFreeShipping > 0 ? (
            <p>
              Add{' '}
              <span className="font-extrabold text-[#0066FF]">
                {currencySymbol}
                {remainingForFreeShipping.toLocaleString('en-IN')}
              </span>{' '}
              more to unlock <strong>FREE SHIPPING</strong>.
            </p>
          ) : (
            <p className="font-bold text-emerald-700">
              You have unlocked FREE SHIPPING on this order!
            </p>
          )}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Items Table */}
        <div className="lg:col-span-8">
          <div className="divide-y divide-[#E5E5E5] border-t border-b border-[#E5E5E5]">
            {cart.map((item) => (
              <div
                key={item.key}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-5"
              >
                <div className="flex gap-4">
                  <Link
                    href={`/products/${item.slug}`}
                    className="h-28 w-24 flex-shrink-0 overflow-hidden bg-[#F4F4F4]"
                  >
                    {item.imageUrl ? (
                      <img
                        src={getOptimizedCloudinaryUrl(item.imageUrl, {
                          width: 400,
                        })}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-neutral-400">
                        ADYORA
                      </div>
                    )}
                  </Link>
                  <div className="flex flex-col justify-between">
                    <div>
                      <Link
                        href={`/products/${item.slug}`}
                        className="text-sm font-extrabold uppercase tracking-wide text-[#080808] hover:text-[#0066FF]"
                      >
                        {item.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-neutral-500">
                        {item.size && <span>Size: {item.size}</span>}
                        {item.colour && <span>Colour: {item.colour}</span>}
                        {item.sku && <span>SKU: {item.sku}</span>}
                      </div>
                      <p className="mt-1.5 text-xs font-bold text-[#080808]">
                        {currencySymbol}
                        {item.price.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6">
                  <div className="flex items-center border border-[#E5E5E5]">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.key, item.quantity - 1)}
                      className="px-3 py-1.5 text-neutral-600 hover:bg-[#F4F4F4]"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-3.5 text-xs font-bold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.key, item.quantity + 1)}
                      className="px-3 py-1.5 text-neutral-600 hover:bg-[#F4F4F4]"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="w-24 text-right text-sm font-black text-[#080808]">
                    {currencySymbol}
                    {(item.price * item.quantity).toLocaleString('en-IN')}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.key)}
                    className="p-1.5 text-neutral-400 hover:text-red-600"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-4">
          <div className="border border-[#E5E5E5] bg-[#F4F4F4]/50 p-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#080808]">
              Order Summary
            </h2>
            <div className="mt-5 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-bold">
                  {currencySymbol}
                  {cartSubtotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Estimated Shipping</span>
                <span className="font-bold">
                  {shippingFee === 0
                    ? 'FREE'
                    : `${currencySymbol}${shippingFee.toLocaleString('en-IN')}`}
                </span>
              </div>
              <div className="border-t border-[#E5E5E5] pt-3 flex justify-between text-sm font-black">
                <span>Estimated Total</span>
                <span>
                  {currencySymbol}
                  {(cartSubtotal + shippingFee).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="mt-6 flex w-full items-center justify-center gap-2 bg-[#080808] py-4 text-xs font-extrabold uppercase tracking-[0.14em] text-white transition hover:bg-[#0066FF]"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <Link
              href="/shop"
              className="mt-3 block text-center text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-[#080808]"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

