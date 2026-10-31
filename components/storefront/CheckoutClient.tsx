'use client';

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, AlertCircle, Tag, RefreshCw } from 'lucide-react';
import { useStore } from './StoreContext';
import { createClient } from '@/utils/supabase/client';
import type { CustomerAddress, WebsiteSettings } from '@/types/database';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: (response: unknown) => void) => void;
    };
  }
}

export function CheckoutClient({ settings }: { settings: WebsiteSettings }) {
  const { cart, cartSubtotal, clearCart } = useStore();
  const currencySymbol = settings.currency_symbol || '₹';

  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
  });

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingRetryOrderId, setPendingRetryOrderId] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<{
    orderId: string;
    orderNumber: string;
  } | null>(null);

  // Pre-fill user details & saved addresses if authenticated
  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: profile }, { data: addresses }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase
            .from('addresses')
            .select('*')
            .eq('user_id', user.id)
            .order('is_default', { ascending: false }),
        ]);

        if (addresses && addresses.length > 0) {
          setSavedAddresses(addresses as CustomerAddress[]);
          const def = addresses[0];
          setForm({
            full_name: def.full_name || profile?.full_name || '',
            email: user.email || profile?.email || '',
            phone: def.phone || profile?.phone || '',
            address_line1: def.address_line1 || '',
            address_line2: def.address_line2 || '',
            city: def.city || '',
            state: def.state || '',
            postal_code: def.postal_code || '',
            country: def.country || 'India',
          });
        } else if (profile) {
          setForm((prev) => ({
            ...prev,
            full_name: profile.full_name || '',
            email: user.email || profile.email || '',
            phone: profile.phone || '',
          }));
        }
      } catch {
        // ignore
      }
    };
    loadUser();
  }, []);

  const discountAmount = appliedCoupon?.discountAmount || 0;
  const taxableBase = Math.max(0, cartSubtotal - discountAmount);
  const taxAmount =
    Math.round(
      ((taxableBase * Number(settings.tax_percentage || 0)) / 100) * 100
    ) / 100;
  const shippingAmount =
    taxableBase >= Number(settings.free_shipping_threshold || 1999)
      ? 0
      : Number(settings.shipping_flat_rate || 0);
  const grandTotal =
    Math.round((taxableBase + taxAmount + shippingAmount) * 100) / 100;

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponInput.trim(),
          subtotal: cartSubtotal,
          customerEmail: form.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || 'Coupon invalid');
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({
          code: data.code,
          discountAmount: Number(data.discountAmount),
        });
      }
    } catch {
      setCouponError('Could not validate coupon.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const launchRazorpayCheckout = async (retryId?: string) => {
    setErrorMessage('');
    setProcessing(true);

    try {
      const res = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retryOrderId: retryId || undefined,
          items: cart.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            size: item.size,
            colour: item.colour,
            quantity: item.quantity,
          })),
          shippingAddress: form,
          couponCode: appliedCoupon?.code || '',
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || 'Could not initialize payment order.');
      }

      if (!window.Razorpay) {
        throw new Error(
          'Razorpay payment gateway script did not load. Please check your connection and try again.'
        );
      }

      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amountInPaise,
        currency: orderData.currency || 'INR',
        name: settings.site_name || 'ADYORA',
        description: `Order #${orderData.orderNumber}`,
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: form.full_name,
          email: form.email,
          contact: form.phone,
        },
        theme: {
          color: '#080808',
        },
        handler: async (response: Record<string, string>) => {
          try {
            const verifyRes = await fetch('/api/checkout/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: orderData.orderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.verified) {
              setPendingRetryOrderId(orderData.orderId);
              setErrorMessage(
                verifyData.error ||
                  'Payment signature verification failed. You can retry payment safely.'
              );
              setProcessing(false);
              return;
            }

            clearCart();
            setCompletedOrder({
              orderId: orderData.orderId,
              orderNumber: orderData.orderNumber,
            });
            setProcessing(false);
          } catch {
            setPendingRetryOrderId(orderData.orderId);
            setErrorMessage(
              'Network interruption during payment verification. Your order was saved — please retry or check My Account.'
            );
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPendingRetryOrderId(orderData.orderId);
            setErrorMessage(
              `Payment window closed for Order #${orderData.orderNumber}. Click "Retry Payment" below to complete your order.`
            );
            setProcessing(false);
          },
        },
      });

      rzp.on('payment.failed', () => {
        setPendingRetryOrderId(orderData.orderId);
        setErrorMessage(
          'Payment failed or was declined by your bank. You can retry payment below.'
        );
        setProcessing(false);
      });

      rzp.open();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to start checkout.'
      );
      setProcessing(false);
    }
  };

  if (completedOrder) {
    return (
      <div className="mx-auto max-w-xl py-20 px-4 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.2em] text-[#0066FF]">
          PAYMENT VERIFIED
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#080808]">
          Order #{completedOrder.orderNumber} Confirmed
        </h1>
        <p className="mt-3 text-xs leading-relaxed text-neutral-600">
          Thank you for shopping with ADYORA. A confirmation email has been sent to{' '}
          <strong>{form.email}</strong>.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/account"
            className="w-full sm:w-auto bg-[#080808] px-8 py-3.5 text-xs font-extrabold uppercase tracking-wider text-white"
          >
            View Order in My Account
          </Link>
          <Link
            href="/shop"
            className="w-full sm:w-auto border border-[#080808] px-8 py-3.5 text-xs font-extrabold uppercase tracking-wider text-[#080808]"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0 && !pendingRetryOrderId) {
    return (
      <div className="mx-auto max-w-xl py-20 px-4 text-center">
        <h1 className="text-2xl font-black uppercase tracking-tight text-[#080808]">
          Your Bag Is Empty
        </h1>
        <Link
          href="/shop"
          className="mt-6 inline-block bg-[#080808] px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-white"
        >
          Return to Shop
        </Link>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 md:py-12">
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#080808]">
          Secure Checkout
        </h1>

        {errorMessage && (
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-red-300 bg-red-50 p-4 text-xs text-red-800">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
            {pendingRetryOrderId && (
              <button
                type="button"
                disabled={processing}
                onClick={() => launchRazorpayCheckout(pendingRetryOrderId)}
                className="inline-flex items-center gap-1.5 bg-[#080808] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#0066FF]"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry Payment
              </button>
            )}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Left: Shipping Details (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {savedAddresses.length > 0 && (
              <div className="border border-[#E5E5E5] p-4">
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#080808]">
                  Saved Addresses
                </p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          full_name: addr.full_name,
                          phone: addr.phone,
                          address_line1: addr.address_line1,
                          address_line2: addr.address_line2,
                          city: addr.city,
                          state: addr.state,
                          postal_code: addr.postal_code,
                          country: addr.country,
                        }))
                      }
                      className="border border-[#E5E5E5] p-3 text-left text-xs hover:border-[#080808]"
                    >
                      <p className="font-bold uppercase">{addr.full_name}</p>
                      <p className="mt-0.5 text-neutral-600 truncate">
                        {addr.address_line1}, {addr.city} {addr.postal_code}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-[#E5E5E5] p-6">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#080808]">
                Shipping Information
              </h2>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={(e) =>
                      setForm({ ...form, full_name: e.target.value })
                    }
                    className="mt-1.5 w-full border border-[#E5E5E5] px-3.5 py-2.5 text-xs focus:border-[#080808] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1.5 w-full border border-[#E5E5E5] px-3.5 py-2.5 text-xs focus:border-[#080808] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1.5 w-full border border-[#E5E5E5] px-3.5 py-2.5 text-xs focus:border-[#080808] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.address_line1}
                    onChange={(e) =>
                      setForm({ ...form, address_line1: e.target.value })
                    }
                    className="mt-1.5 w-full border border-[#E5E5E5] px-3.5 py-2.5 text-xs focus:border-[#080808] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.address_line2}
                    onChange={(e) =>
                      setForm({ ...form, address_line2: e.target.value })
                    }
                    className="mt-1.5 w-full border border-[#E5E5E5] px-3.5 py-2.5 text-xs focus:border-[#080808] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="mt-1.5 w-full border border-[#E5E5E5] px-3.5 py-2.5 text-xs focus:border-[#080808] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="mt-1.5 w-full border border-[#E5E5E5] px-3.5 py-2.5 text-xs focus:border-[#080808] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                    PIN / Postal Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.postal_code}
                    onChange={(e) =>
                      setForm({ ...form, postal_code: e.target.value })
                    }
                    className="mt-1.5 w-full border border-[#E5E5E5] px-3.5 py-2.5 text-xs focus:border-[#080808] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                    Country
                  </label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) =>
                      setForm({ ...form, country: e.target.value })
                    }
                    className="mt-1.5 w-full border border-[#E5E5E5] bg-[#F4F4F4]/50 px-3.5 py-2.5 text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Order Summary & Payment (5 cols) */}
          <div className="lg:col-span-5">
            <div className="border border-[#E5E5E5] bg-[#F4F4F4]/50 p-6">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#080808]">
                Order Summary ({cart.length} items)
              </h2>

              <ul className="mt-4 divide-y divide-[#E5E5E5] max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <li
                    key={item.key}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <div>
                      <p className="font-bold uppercase text-[#080808]">
                        {item.name} &times; {item.quantity}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        {item.size} {item.colour && `/ ${item.colour}`}
                      </p>
                    </div>
                    <span className="font-bold">
                      {currencySymbol}
                      {(item.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Coupon Input */}
              <div className="mt-5 border-t border-[#E5E5E5] pt-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Promo / Coupon Code
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) =>
                      setCouponInput(e.target.value.toUpperCase())
                    }
                    placeholder="ENTER CODE"
                    className="flex-1 border border-[#E5E5E5] bg-white px-3 py-2 text-xs uppercase focus:border-[#080808] focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={validatingCoupon}
                    onClick={handleApplyCoupon}
                    className="bg-[#080808] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#0066FF]"
                  >
                    {validatingCoupon ? '...' : 'Apply'}
                  </button>
                </div>
                {couponError && (
                  <p className="mt-1.5 text-[11px] text-red-600">{couponError}</p>
                )}
                {appliedCoupon && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                    <Tag className="h-3 w-3" /> Coupon {appliedCoupon.code} applied (
                    -{currencySymbol}
                    {appliedCoupon.discountAmount.toLocaleString('en-IN')})
                  </p>
                )}
              </div>

              {/* Totals */}
              <div className="mt-5 space-y-2.5 border-t border-[#E5E5E5] pt-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="font-bold">
                    {currencySymbol}
                    {cartSubtotal.toLocaleString('en-IN')}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Coupon Discount</span>
                    <span className="font-bold">
                      -{currencySymbol}
                      {discountAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-600">Tax</span>
                  <span className="font-bold">
                    {currencySymbol}
                    {taxAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Shipping</span>
                  <span className="font-bold">
                    {shippingAmount === 0
                      ? 'FREE'
                      : `${currencySymbol}${shippingAmount.toLocaleString('en-IN')}`}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#E5E5E5] pt-3 text-base font-black text-[#080808]">
                  <span>Total Payable</span>
                  <span>
                    {currencySymbol}
                    {grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={processing}
                onClick={() => launchRazorpayCheckout()}
                className="mt-6 flex w-full items-center justify-center gap-2 bg-[#080808] py-4 text-xs font-extrabold uppercase tracking-[0.14em] text-white transition hover:bg-[#0066FF] disabled:opacity-60"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>
                  {processing
                    ? 'Verifying & Initializing...'
                    : `Pay ${currencySymbol}${grandTotal.toLocaleString('en-IN')} via Razorpay`}
                </span>
              </button>

              <p className="mt-3 text-center text-[10px] text-neutral-500">
                100% Encrypted Server-Verified Razorpay Checkout (UPI, Cards, NetBanking)
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

