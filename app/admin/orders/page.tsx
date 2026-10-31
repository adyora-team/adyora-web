'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  FileText,
  Check,
  X,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { Order, OrderStatus, PaymentStatus } from '@/types/database';

const ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
  'Refunded',
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  'Pending',
  'Paid',
  'Failed',
  'Refunded',
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(200);
    setOrders((data as Order[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      statusFilter === 'ALL' || o.order_status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.customer_email.toLowerCase().includes(q) ||
      o.customer_phone.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSaving(true);
    setStatusMsg('');

    try {
      const res = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          order_status: selectedOrder.order_status,
          payment_status: selectedOrder.payment_status,
          shipping_status: selectedOrder.shipping_status,
          tracking_number: selectedOrder.tracking_number,
          courier_name: selectedOrder.courier_name,
          order_notes: selectedOrder.order_notes,
          refund_status: selectedOrder.refund_status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      setStatusMsg(
        data.emailTriggered
          ? `Order #${selectedOrder.order_number} updated & Brevo "${data.emailTriggered}" email sent.`
          : `Order #${selectedOrder.order_number} updated.`
      );
      await fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#0066FF]">
          FULFILLMENT & DISPATCH
        </p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">
          Order Management
        </h1>
      </div>

      {statusMsg && (
        <div className="border border-[#0066FF]/30 bg-[#0066FF]/10 px-4 py-3 text-xs font-bold">
          {statusMsg}
        </div>
      )}

      {/* Search & Status Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between border border-[#E5E5E5] bg-white p-4">
        <div className="flex flex-1 items-center gap-2 border border-[#E5E5E5] px-3 py-2">
          <Search className="h-4 w-4 text-neutral-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order #, customer name, email, phone..."
            className="w-full text-xs focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {['ALL', ...ORDER_STATUSES].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border ${
                statusFilter === st
                  ? 'border-[#080808] bg-[#080808] text-white'
                  : 'border-[#E5E5E5] bg-white text-[#080808]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Order Detail Drawer / Editor */}
      {selectedOrder && (
        <form
          onSubmit={handleUpdateOrder}
          className="border border-[#E5E5E5] bg-white p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
            <div>
              <h2 className="text-sm font-black uppercase">
                Manage Order #{selectedOrder.order_number}
              </h2>
              <p className="text-xs text-neutral-500">
                Customer: {selectedOrder.customer_name} (
                {selectedOrder.customer_email} | {selectedOrder.customer_phone})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/orders/${selectedOrder.id}/invoice`}
                target="_blank"
                className="inline-flex items-center gap-1 border border-[#080808] px-3 py-1.5 text-xs font-bold uppercase"
              >
                <FileText className="h-3.5 w-3.5" /> Printable Invoice
              </Link>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-neutral-400 hover:text-[#080808]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-neutral-600">
                Order Status (Triggers Brevo Email)
              </label>
              <select
                value={selectedOrder.order_status}
                onChange={(e) =>
                  setSelectedOrder({
                    ...selectedOrder,
                    order_status: e.target.value as OrderStatus,
                  })
                }
                className="mt-1 w-full border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-bold"
              >
                {ORDER_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-neutral-600">
                Payment Status
              </label>
              <select
                value={selectedOrder.payment_status}
                onChange={(e) =>
                  setSelectedOrder({
                    ...selectedOrder,
                    payment_status: e.target.value as PaymentStatus,
                  })
                }
                className="mt-1 w-full border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-bold"
              >
                {PAYMENT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-neutral-600">
                Shipping Status
              </label>
              <input
                type="text"
                value={selectedOrder.shipping_status}
                onChange={(e) =>
                  setSelectedOrder({
                    ...selectedOrder,
                    shipping_status: e.target.value,
                  })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-neutral-600">
                Courier Partner Name
              </label>
              <input
                type="text"
                placeholder="BlueDart, Delhivery, DTDC..."
                value={selectedOrder.courier_name}
                onChange={(e) =>
                  setSelectedOrder({
                    ...selectedOrder,
                    courier_name: e.target.value,
                  })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-neutral-600">
                Tracking Number / AWB
              </label>
              <input
                type="text"
                value={selectedOrder.tracking_number}
                onChange={(e) =>
                  setSelectedOrder({
                    ...selectedOrder,
                    tracking_number: e.target.value,
                  })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-neutral-600">
                Refund Status
              </label>
              <input
                type="text"
                value={selectedOrder.refund_status}
                onChange={(e) =>
                  setSelectedOrder({
                    ...selectedOrder,
                    refund_status: e.target.value,
                  })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold uppercase text-neutral-600">
                Admin Order Notes
              </label>
              <textarea
                rows={2}
                value={selectedOrder.order_notes}
                onChange={(e) =>
                  setSelectedOrder({
                    ...selectedOrder,
                    order_notes: e.target.value,
                  })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[#E5E5E5] pt-4">
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="border border-[#E5E5E5] px-4 py-2 text-xs font-bold uppercase"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-[#080808] px-6 py-2 text-xs font-extrabold uppercase text-white hover:bg-[#0066FF]"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{saving ? 'Updating...' : 'Update Order & Notify Customer'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Orders Table */}
      <div className="border border-[#E5E5E5] bg-white">
        {loading ? (
          <p className="p-8 text-center text-xs text-neutral-500">
            Loading orders...
          </p>
        ) : filteredOrders.length === 0 ? (
          <p className="p-8 text-center text-xs text-neutral-500">
            No matching orders found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#F4F4F4] text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Order Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F4F4F4]/30">
                    <td className="px-4 py-3 font-extrabold">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold">{order.customer_name}</p>
                      <p className="text-[11px] text-neutral-500">
                        {order.customer_email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {(order.order_items || []).length} items
                    </td>
                    <td className="px-4 py-3 font-extrabold">
                      ₹{Number(order.total_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                          order.payment_status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {order.order_status}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {new Date(order.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder({ ...order })}
                        className="border border-[#080808] bg-[#080808] px-3 py-1 text-[11px] font-bold uppercase text-white hover:bg-[#0066FF]"
                      >
                        Manage
                      </button>
                      <Link
                        href={`/orders/${order.id}/invoice`}
                        target="_blank"
                        className="inline-block border border-[#E5E5E5] px-2.5 py-1 text-[11px] font-bold uppercase"
                      >
                        Invoice
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

