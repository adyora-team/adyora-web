'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { NavigationItem } from '@/types/database';

const EMPTY_NAV = {
  id: '',
  parent_id: '',
  label: '',
  href: '/categories/',
  location: 'both' as 'main' | 'mobile' | 'both',
  display_order: 1,
  is_visible: true,
};

export default function AdminNavigationPage() {
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [editing, setEditing] = useState<typeof EMPTY_NAV | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchNav = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('navigation_items')
      .select('*')
      .order('display_order', { ascending: true });
    setItems((data as NavigationItem[]) || []);
  };

  useEffect(() => {
    fetchNav();
  }, []);

  const revalidate = async () => {
    await fetch('/api/admin/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: ['navigation'] }),
    }).catch(() => {});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        parent_id: editing.parent_id || null,
        label: editing.label.trim(),
        href: editing.href.trim(),
        location: editing.location,
        display_order: Number(editing.display_order) || 0,
        is_visible: editing.is_visible,
        updated_at: new Date().toISOString(),
      };

      if (editing.id) {
        await supabase
          .from('navigation_items')
          .update(payload)
          .eq('id', editing.id);
      } else {
        await supabase.from('navigation_items').insert(payload);
      }

      await revalidate();
      await fetchNav();
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete navigation item?')) return;
    const supabase = createClient();
    await supabase.from('navigation_items').delete().eq('id', id);
    await revalidate();
    fetchNav();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#0066FF]">
            MENUS & LINKS
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">
            Navigation Management
          </h1>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditing({ ...EMPTY_NAV, display_order: items.length + 1 })
          }
          className="inline-flex items-center gap-2 bg-[#080808] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#0066FF]"
        >
          <Plus className="h-4 w-4" /> Add Nav Item
        </button>
      </div>

      {editing && (
        <form
          onSubmit={handleSave}
          className="border border-[#E5E5E5] bg-white p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
            <h2 className="text-sm font-black uppercase">
              {editing.id ? 'Edit Navigation Item' : 'New Navigation Item'}
            </h2>
            <button type="button" onClick={() => setEditing(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-[11px] font-bold uppercase">
                Label *
              </label>
              <input
                type="text"
                required
                value={editing.label}
                onChange={(e) =>
                  setEditing({ ...editing, label: e.target.value })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase">
                Destination URL *
              </label>
              <input
                type="text"
                required
                value={editing.href}
                onChange={(e) =>
                  setEditing({ ...editing, href: e.target.value })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase">
                Menu Location
              </label>
              <select
                value={editing.location}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    location: e.target.value as 'main' | 'mobile' | 'both',
                  })
                }
                className="mt-1 w-full border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
              >
                <option value="both">Desktop & Mobile</option>
                <option value="main">Desktop Header Only</option>
                <option value="mobile">Mobile Drawer Only</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase">
                Display Order
              </label>
              <input
                type="number"
                value={editing.display_order}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    display_order: Number(e.target.value),
                  })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                checked={editing.is_visible}
                onChange={(e) =>
                  setEditing({ ...editing, is_visible: e.target.checked })
                }
                className="h-4 w-4 accent-[#080808]"
              />
              <span className="text-xs font-bold uppercase">Visible</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-[#080808] px-5 py-2 text-xs font-bold uppercase text-white"
            >
              <Check className="h-3.5 w-3.5" /> Save Item
            </button>
          </div>
        </form>
      )}

      <div className="border border-[#E5E5E5] bg-white">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E5E5E5] bg-[#F4F4F4] text-[10px] font-bold uppercase tracking-wider text-neutral-600">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-extrabold">
                  #{item.display_order}
                </td>
                <td className="px-4 py-3 font-bold uppercase">{item.label}</td>
                <td className="px-4 py-3 text-neutral-500">{item.href}</td>
                <td className="px-4 py-3 uppercase">{item.location}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                      item.is_visible
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {item.is_visible ? 'Visible' : 'Hidden'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        id: item.id,
                        parent_id: item.parent_id || '',
                        label: item.label,
                        href: item.href,
                        location: item.location,
                        display_order: item.display_order,
                        is_visible: item.is_visible,
                      })
                    }
                    className="border border-[#E5E5E5] px-2.5 py-1 font-bold"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
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

