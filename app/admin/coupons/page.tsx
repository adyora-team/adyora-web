'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { Coupon } from '@/types/database';

const EMPTY_COUPON = {
  id: '',
  code: '',
  description: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_amount: 10,
  minimum_order_value: 999,
  maximum_discount: '',
  start_date: '',
  expiry_date: '',
  usage_limit: '',
  per_customer_limit: 1,
  is_active: true,
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [editing, setEditing] = useState<typeof EMPTY_COUPON | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchCoupons = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    setCoupons((data as Coupon[]) || []);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        code: editing.code.trim().toUpperCase(),
        description: editing.description.trim(),
        discount_type: editing.discount_type,
        discount_amount: Number(editing.discount_amount) || 0,
        minimum_order_value: Number(editing.minimum_order_value) || 0,
        maximum_discount: editing.maximum_discount
          ? Number(editing.maximum_discount)
          : null,
        start_date: editing.start_date || new Date().toISOString(),
        expiry_date: editing.expiry_date || null,
        usage_limit: editing.usage_limit ? Number(editing.usage_limit) : null,
        per_customer_limit: Number(editing.per_customer_limit) || 1,
        is_active: editing.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editing.id) {
        await supabase.from('coupons').update(payload).eq('id', editing.id);
      } else {
        await supabase.from('coupons').insert(payload);
      }

      await fetchCoupons();
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    const supabase = createClient();
    await supabase.from('coupons').delete().eq('id', id);
    fetchCoupons();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#0066FF]">
            PROMOTIONS
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">
            Coupons & Discounts
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ ...EMPTY_COUPON })}
          className="inline-flex items-center gap-2 bg-[#080808] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#0066FF]"
        >
          <Plus className="h-4 w-4" /> Create Coupon
        </button>
      </div>

      {editing && (
        <form
          onSubmit={handleSave}
          className="border border-[#E5E5E5] bg-white p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
            <h2 className="text-sm font-black uppercase">
              {editing.id ? `Edit Coupon: ${editing.code}` : 'New Coupon'}
            </h2>
            <button type="button" onClick={() => setEditing(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-[11px] font-bold uppercase">
                Coupon Code *
              </label>
              <input
                type="text"
                required
                value={editing.code}
                onChange={(e) =>
                  setEditing({ ...editing, code: e.target.value.toUpperCase() })
                }
                placeholder="ADYORA10"
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase">
                Discount Type
              </label>
              <select
                value={editing.discount_type}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    discount_type: e.target.value as 'percentage' | 'fixed',
                  })
                }
                className="mt-1 w-full border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase">
                Discount Amount *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={editing.discount_amount}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    discount_amount: Number(e.target.value),
                  })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase">
                Minimum Order Value (₹)
              </label>
              <input
                type="number"
                value={editing.minimum_order_value}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    minimum_order_value: Number(e.target.value),
                  })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase">
                Maximum Discount Cap (₹, optional)
              </label>
              <input
                type="number"
                value={editing.maximum_discount}
                onChange={(e) =>
                  setEditing({ ...editing, maximum_discount: e.target.value })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase">
                Total Usage Limit (Optional)
              </label>
              <input
                type="number"
                value={editing.usage_limit}
                onChange={(e) =>
                  setEditing({ ...editing, usage_limit: e.target.value })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase">
                Per-Customer Limit
              </label>
              <input
                type="number"
                value={editing.per_customer_limit}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    per_customer_limit: Number(e.target.value),
                  })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase">
                Expiry Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={editing.expiry_date}
                onChange={(e) =>
                  setEditing({ ...editing, expiry_date: e.target.value })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(e) =>
                  setEditing({ ...editing, is_active: e.target.checked })
                }
                className="h-4 w-4 accent-[#080808]"
              />
              <span className="text-xs font-bold uppercase">Active</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-[#080808] px-5 py-2 text-xs font-bold uppercase text-white"
            >
              <Check className="h-3.5 w-3.5" /> Save Coupon
            </button>
          </div>
        </form>
      )}

      <div className="border border-[#E5E5E5] bg-white">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E5E5E5] bg-[#F4F4F4] text-[10px] font-bold uppercase tracking-wider text-neutral-600">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Min Order</th>
              <th className="px-4 py-3">Used / Limit</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-extrabold">{c.code}</td>
                <td className="px-4 py-3 font-bold">
                  {c.discount_type === 'percentage'
                    ? `${c.discount_amount}%`
                    : `₹${c.discount_amount}`}
                </td>
                <td className="px-4 py-3">
                  ₹{Number(c.minimum_order_value).toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3">
                  {c.used_count} / {c.usage_limit ?? '∞'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                      c.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        id: c.id,
                        code: c.code,
                        description: c.description || '',
                        discount_type: c.discount_type,
                        discount_amount: Number(c.discount_amount),
                        minimum_order_value: Number(c.minimum_order_value),
                        maximum_discount: c.maximum_discount
                          ? String(c.maximum_discount)
                          : '',
                        start_date: c.start_date
                          ? c.start_date.slice(0, 16)
                          : '',
                        expiry_date: c.expiry_date
                          ? c.expiry_date.slice(0, 16)
                          : '',
                        usage_limit: c.usage_limit ? String(c.usage_limit) : '',
                        per_customer_limit: c.per_customer_limit,
                        is_active: c.is_active,
                      })
                    }
                    className="border border-[#E5E5E5] px-2.5 py-1 font-bold"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="border border-red-200 px-2.5 py-1 text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

