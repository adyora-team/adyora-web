'use client';

import React, { useEffect, useState } from 'react';
import { Search, UserCheck, UserX } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { CustomerAddress, Order, Profile } from '@/types/database';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: profs }, { data: ords }, { data: addrs }] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('id, order_number, user_id, customer_email, total_amount, order_status, payment_status, created_at'),
        supabase.from('addresses').select('*'),
      ]);

    setCustomers((profs as Profile[]) || []);
    setOrders((ords as Order[]) || []);
    setAddresses((addrs as CustomerAddress[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleToggleActive = async (cust: Profile) => {
    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({
        is_active: !cust.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cust.id);
    fetchCustomers();
  };

  const filtered = customers.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.email.toLowerCase().includes(q) ||
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#0066FF]">
          CRM & ACCOUNTS
        </p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">
          Customer Management
        </h1>
      </div>

      <div className="flex items-center gap-2 border border-[#E5E5E5] bg-white px-4 py-3">
        <Search className="h-4 w-4 text-neutral-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customers by name, email, or phone..."
          className="w-full text-xs focus:outline-none"
        />
      </div>

      {selectedCustomer && (
        <div className="border border-[#E5E5E5] bg-white p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
            <div>
              <h2 className="text-sm font-black uppercase">
                Customer Profile: {selectedCustomer.full_name || selectedCustomer.email}
              </h2>
              <p className="text-xs text-neutral-500">
                Email: {selectedCustomer.email} | Phone:{' '}
                {selectedCustomer.phone || 'N/A'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCustomer(null)}
              className="border border-[#E5E5E5] px-3 py-1 text-xs font-bold uppercase"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider">
                Saved Addresses
              </h3>
              <div className="mt-2 space-y-2 text-xs">
                {addresses
                  .filter((a) => a.user_id === selectedCustomer.id)
                  .map((addr) => (
                    <div
                      key={addr.id}
                      className="border border-[#E5E5E5] bg-[#F4F4F4]/50 p-3"
                    >
                      <p className="font-bold">{addr.full_name}</p>
                      <p className="text-neutral-600">
                        {addr.address_line1}, {addr.city}, {addr.state} -{' '}
                        {addr.postal_code}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider">
                Order History
              </h3>
              <div className="mt-2 space-y-2 text-xs">
                {orders
                  .filter(
                    (o) =>
                      o.user_id === selectedCustomer.id ||
                      o.customer_email === selectedCustomer.email
                  )
                  .map((ord) => (
                    <div
                      key={ord.id}
                      className="flex items-center justify-between border border-[#E5E5E5] p-3"
                    >
                      <div>
                        <p className="font-bold">#{ord.order_number}</p>
                        <p className="text-[11px] text-neutral-500">
                          {ord.order_status} ({ord.payment_status})
                        </p>
                      </div>
                      <span className="font-extrabold">
                        ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border border-[#E5E5E5] bg-white">
        {loading ? (
          <p className="p-8 text-center text-xs text-neutral-500">
            Loading customers...
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-xs text-neutral-500">
            No customers found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#F4F4F4] text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {filtered.map((cust) => {
                  const custOrdersCount = orders.filter(
                    (o) =>
                      o.user_id === cust.id || o.customer_email === cust.email
                  ).length;

                  return (
                    <tr key={cust.id}>
                      <td className="px-4 py-3 font-bold">
                        {cust.full_name || 'Customer'}
                      </td>
                      <td className="px-4 py-3">{cust.email}</td>
                      <td className="px-4 py-3">{cust.phone || '—'}</td>
                      <td className="px-4 py-3 font-bold">{custOrdersCount}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(cust)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase ${
                            cust.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {cust.is_active ? (
                            <>
                              <UserCheck className="h-3 w-3" /> Active
                            </>
                          ) : (
                            <>
                              <UserX className="h-3 w-3" /> Suspended
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(cust)}
                          className="border border-[#E5E5E5] px-3 py-1 font-bold uppercase hover:border-[#080808]"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

