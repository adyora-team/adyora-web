import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  ShoppingBag,
  ClipboardList,
  Users,
  AlertTriangle,
  IndianRupee,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import type { Order, Product } from '@/types/database';

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [
    { data: orders },
    { count: totalCustomers },
    { data: products },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_email, total_amount, payment_status, order_status, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('products')
      .select('id, name, sku, selling_price, stock_quantity, is_published')
      .order('stock_quantity', { ascending: true }),
  ]);

  const allOrders = (orders as Order[]) || [];
  const allProducts = (products as Product[]) || [];

  const totalOrdersCount = allOrders.length;
  const pendingOrdersCount = allOrders.filter(
    (o) => o.order_status === 'Pending' || o.order_status === 'Processing'
  ).length;
  const totalRevenue = allOrders
    .filter((o) => o.payment_status === 'Paid')
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const lowStockProducts = allProducts.filter(
    (p) => Number(p.stock_quantity) <= 5
  );

  // Group sales by status for sales overview
  const statusCounts = allOrders.reduce<Record<string, number>>((acc, o) => {
    acc[o.order_status] = (acc[o.order_status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#0066FF]">
          OVERVIEW & REAL-TIME METRICS
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#080808]">
          ADYORA Admin Dashboard
        </h1>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="border border-[#E5E5E5] bg-white p-5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Revenue
            </span>
            <IndianRupee className="h-4 w-4 text-[#0066FF]" />
          </div>
          <p className="mt-3 text-xl font-black text-[#080808]">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">Verified paid orders</p>
        </div>

        <div className="border border-[#E5E5E5] bg-white p-5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Orders
            </span>
            <ClipboardList className="h-4 w-4 text-[#080808]" />
          </div>
          <p className="mt-3 text-xl font-black text-[#080808]">
            {totalOrdersCount}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">All time</p>
        </div>

        <div className="border border-[#E5E5E5] bg-white p-5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Pending Orders
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-3 text-xl font-black text-[#080808]">
            {pendingOrdersCount}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">Awaiting fulfillment</p>
        </div>

        <div className="border border-[#E5E5E5] bg-white p-5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Customers
            </span>
            <Users className="h-4 w-4 text-[#080808]" />
          </div>
          <p className="mt-3 text-xl font-black text-[#080808]">
            {totalCustomers || 0}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">Registered profiles</p>
        </div>

        <div className="border border-[#E5E5E5] bg-white p-5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Products
            </span>
            <ShoppingBag className="h-4 w-4 text-[#080808]" />
          </div>
          <p className="mt-3 text-xl font-black text-[#080808]">
            {allProducts.length}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">
            {allProducts.filter((p) => p.is_published).length} published
          </p>
        </div>

        <div className="border border-[#E5E5E5] bg-white p-5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Low-Stock Items
            </span>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <p className="mt-3 text-xl font-black text-red-600">
            {lowStockProducts.length}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">&le; 5 units remaining</p>
        </div>
      </div>

      {/* Sales Overview & Low Stock Alert Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Recent Orders Table (8 cols) */}
        <div className="lg:col-span-8 border border-[#E5E5E5] bg-white p-6">
          <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#080808]">
              Recent Orders
            </h2>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#0066FF] hover:underline"
            >
              Manage All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {allOrders.length === 0 ? (
            <p className="py-10 text-center text-xs text-neutral-500">
              No orders recorded yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5E5] text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    <th className="py-2.5">Order #</th>
                    <th className="py-2.5">Customer</th>
                    <th className="py-2.5">Total</th>
                    <th className="py-2.5">Payment</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {allOrders.slice(0, 8).map((order) => (
                    <tr key={order.id}>
                      <td className="py-3 font-extrabold">
                        {order.order_number}
                      </td>
                      <td className="py-3">
                        <p className="font-semibold">{order.customer_name}</p>
                        <p className="text-[11px] text-neutral-400">
                          {order.customer_email}
                        </p>
                      </td>
                      <td className="py-3 font-bold">
                        ₹{Number(order.total_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3">
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
                      <td className="py-3 font-semibold">{order.order_status}</td>
                      <td className="py-3 text-neutral-500">
                        {new Date(order.created_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock & Sales Status Breakdown (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="border border-[#E5E5E5] bg-white p-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#080808]">
              Sales Status Overview
            </h2>
            <div className="mt-4 space-y-2.5 text-xs">
              {[
                'Pending',
                'Confirmed',
                'Processing',
                'Shipped',
                'Delivered',
                'Cancelled',
                'Refunded',
              ].map((st) => (
                <div
                  key={st}
                  className="flex items-center justify-between border-b border-[#E5E5E5]/60 pb-2"
                >
                  <span className="font-semibold text-neutral-600">{st}</span>
                  <span className="font-extrabold text-[#080808]">
                    {statusCounts[st] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#E5E5E5] bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#080808]">
                Low-Stock Alerts
              </h2>
              <Link
                href="/admin/products"
                className="text-[11px] font-bold uppercase text-[#0066FF]"
              >
                Restock
              </Link>
            </div>
            {lowStockProducts.length === 0 ? (
              <p className="mt-4 text-xs text-neutral-500">
                All products are well stocked.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[#E5E5E5] text-xs">
                {lowStockProducts.slice(0, 6).map((prod) => (
                  <li
                    key={prod.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div>
                      <p className="font-bold uppercase text-[#080808]">
                        {prod.name}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        SKU: {prod.sku}
                      </p>
                    </div>
                    <span className="bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-700">
                      {prod.stock_quantity} left
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

