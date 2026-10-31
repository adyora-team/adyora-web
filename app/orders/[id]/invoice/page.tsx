import React from 'react';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getWebsiteSettings } from '@/lib/cms';
import type { Order } from '@/types/database';
import { PrintInvoiceButton } from '@/components/storefront/PrintInvoiceButton';

export default async function OrderInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/orders/${id}/invoice`);
  }

  const [{ data: order }, { data: roleRow }, settings] = await Promise.all([
    supabase.from('orders').select('*, order_items(*)').eq('id', id).single(),
    supabase.from('user_roles').select('role').eq('user_id', user.id).single(),
    getWebsiteSettings(),
  ]);

  if (!order) {
    notFound();
  }

  const isAdmin = roleRow?.role === 'admin';
  if (order.user_id !== user.id && !isAdmin) {
    notFound();
  }

  const typedOrder = order as Order;
  const currency = settings.currency_symbol || '₹';

  return (
    <div className="min-h-screen bg-white p-8 text-[#080808]">
      <div className="mx-auto max-w-3xl border border-[#E5E5E5] p-8">
        <div className="flex items-start justify-between border-b border-[#E5E5E5] pb-6">
          <div>
            <h1 className="text-2xl font-black italic tracking-wider text-[#080808]">
              {settings.site_name || 'ADYORA'}
            </h1>
            <p className="mt-1 text-xs text-neutral-500">
              TAX INVOICE / ORDER RECEIPT
            </p>
            {settings.store_address && (
              <p className="mt-1 max-w-xs text-[11px] text-neutral-500">
                {settings.store_address}
              </p>
            )}
          </div>
          <div className="text-right text-xs">
            <p className="font-extrabold uppercase">
              Invoice #{typedOrder.order_number}
            </p>
            <p className="mt-1 text-neutral-500">
              Date:{' '}
              {new Date(typedOrder.created_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
            <p className="mt-1 font-bold">
              Payment Status: {typedOrder.payment_status}
            </p>
            <div className="mt-3 print:hidden">
              <PrintInvoiceButton />
            </div>
          </div>
        </div>

        {/* Customer & Shipping Info */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 text-xs">
          <div>
            <h2 className="font-extrabold uppercase tracking-wider text-neutral-500">
              Billed & Shipped To
            </h2>
            <p className="mt-1.5 font-bold uppercase">
              {typedOrder.shipping_address?.full_name || typedOrder.customer_name}
            </p>
            <p className="text-neutral-700">
              {typedOrder.shipping_address?.address_line1}
            </p>
            {typedOrder.shipping_address?.address_line2 && (
              <p className="text-neutral-700">
                {typedOrder.shipping_address.address_line2}
              </p>
            )}
            <p className="text-neutral-700">
              {typedOrder.shipping_address?.city},{' '}
              {typedOrder.shipping_address?.state} -{' '}
              {typedOrder.shipping_address?.postal_code}
            </p>
            <p className="mt-1 text-neutral-600">
              Phone: {typedOrder.customer_phone} | Email:{' '}
              {typedOrder.customer_email}
            </p>
          </div>
          <div className="sm:text-right">
            <h2 className="font-extrabold uppercase tracking-wider text-neutral-500">
              Fulfillment Details
            </h2>
            <p className="mt-1.5">
              Order Status: <strong>{typedOrder.order_status}</strong>
            </p>
            {typedOrder.courier_name && (
              <p>Courier: {typedOrder.courier_name}</p>
            )}
            {typedOrder.tracking_number && (
              <p>Tracking No: {typedOrder.tracking_number}</p>
            )}
          </div>
        </div>

        {/* Line Items */}
        <table className="mt-8 w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-t border-[#080808] uppercase">
              <th className="py-2.5">Item</th>
              <th className="py-2.5">SKU / Variant</th>
              <th className="py-2.5 text-right">Price</th>
              <th className="py-2.5 text-right">Qty</th>
              <th className="py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {(typedOrder.order_items || []).map((item) => (
              <tr key={item.id}>
                <td className="py-3 font-bold uppercase">{item.product_name}</td>
                <td className="py-3 text-neutral-600">
                  {item.sku} {item.size && `| ${item.size}`}{' '}
                  {item.colour && `| ${item.colour}`}
                </td>
                <td className="py-3 text-right">
                  {currency}
                  {Number(item.unit_price).toLocaleString('en-IN')}
                </td>
                <td className="py-3 text-right">{item.quantity}</td>
                <td className="py-3 text-right font-bold">
                  {currency}
                  {Number(item.line_total).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>
                {currency}
                {Number(typedOrder.subtotal).toLocaleString('en-IN')}
              </span>
            </div>
            {Number(typedOrder.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount ({typedOrder.coupon_code})</span>
                <span>
                  -{currency}
                  {Number(typedOrder.discount_amount).toLocaleString('en-IN')}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax</span>
              <span>
                {currency}
                {Number(typedOrder.tax_amount).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>
                {currency}
                {Number(typedOrder.shipping_amount).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#080808] pt-2 text-sm font-black">
              <span>Grand Total</span>
              <span>
                {currency}
                {Number(typedOrder.total_amount).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

