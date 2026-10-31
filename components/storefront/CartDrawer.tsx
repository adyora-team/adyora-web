'use client';

import React from 'react';
import Link from 'next/link';
import { X, Plus, Minus, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useStore } from './StoreContext';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';

export function CartDrawer({ currencySymbol = '₹' }: { currencySymbol?: string }) {
  const {
    cart,
    cartCount,
    cartSubtotal,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
  } = useStore();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[1px]">
      <div
        className="fixed inset-0"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white text-[#080808] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider">
              Shopping Bag ({cartCount})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            className="p-1.5 text-neutral-500 hover:text-[#080808]"
            aria-label="Close shopping bag"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag className="mb-4 h-12 w-12 stroke-[1.2] text-neutral-300" />
              <p className="text-sm font-bold uppercase tracking-wider text-[#080808]">
                Your bag is empty
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Explore the latest streetwear drops from ADYORA.
              </p>
              <Link
                href="/shop"
                onClick={() => setIsCartOpen(false)}
                className="mt-6 inline-flex items-center gap-2 bg-[#080808] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-neutral-800"
              >
                Shop Collection <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#E5E5E5]">
              {cart.map((item) => (
                <li key={item.key} className="flex gap-4 py-4">
                  <Link
                    href={`/products/${item.slug}`}
                    onClick={() => setIsCartOpen(false)}
                    className="h-24 w-20 flex-shrink-0 overflow-hidden bg-[#F4F4F4]"
                  >
                    {item.imageUrl ? (
                      <img
                        src={getOptimizedCloudinaryUrl(item.imageUrl, { width: 400 })}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase text-neutral-400">
                        ADYORA
                      </div>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/products/${item.slug}`}
                          onClick={() => setIsCartOpen(false)}
                          className="text-xs font-bold uppercase tracking-wide text-[#080808] hover:underline"
                        >
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.key)}
                          className="text-neutral-400 hover:text-red-600"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-neutral-500">
                        {item.size && <span>Size: {item.size}</span>}
                        {item.colour && <span>Colour: {item.colour}</span>}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center border border-[#E5E5E5]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          className="px-2 py-1 text-neutral-600 hover:bg-[#F4F4F4]"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          className="px-2 py-1 text-neutral-600 hover:bg-[#F4F4F4]"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-[#080808]">
                          {currencySymbol}
                          {(item.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-[#E5E5E5] bg-[#F4F4F4]/60 px-6 py-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                Subtotal
              </span>
              <span className="text-base font-extrabold text-[#080808]">
                {currencySymbol}
                {cartSubtotal.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="mb-4 text-[11px] text-neutral-500">
              Shipping and taxes calculated at checkout.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/cart"
                onClick={() => setIsCartOpen(false)}
                className="flex items-center justify-center border border-[#080808] bg-white py-3 text-xs font-bold uppercase tracking-wider text-[#080808] transition hover:bg-neutral-100"
              >
                View Bag
              </Link>
              <Link
                href="/checkout"
                onClick={() => setIsCartOpen(false)}
                className="flex items-center justify-center gap-1.5 bg-[#080808] py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#0066FF]"
              >
                Checkout <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

