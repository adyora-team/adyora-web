'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { Category } from '@/types/database';
import { CloudinaryUploader } from '@/components/admin/CloudinaryUploader';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';

const EMPTY_CATEGORY = {
  id: '',
  name: '',
  slug: '',
  description: '',
  cloudinary_public_id: '',
  image_url: '',
  image_focal_x: 50,
  image_focal_y: 50,
  display_order: 1,
  is_visible: true,
  seo_title: '',
  seo_description: '',
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<typeof EMPTY_CATEGORY | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });
    setCategories((data as Category[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const revalidateStorefront = async () => {
    await fetch('/api/admin/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: ['categories', 'homepage', 'navigation'] }),
    }).catch(() => {});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setStatusMsg('');

    try {
      const supabase = createClient();
      const slug =
        editing.slug.trim() ||
        editing.name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

      const payload = {
        name: editing.name.trim(),
        slug,
        description: editing.description.trim(),
        cloudinary_public_id: editing.cloudinary_public_id,
        image_url: editing.image_url,
        image_focal_x: Number(editing.image_focal_x) || 50,
        image_focal_y: Number(editing.image_focal_y) || 50,
        display_order: Number(editing.display_order) || 1,
        is_visible: editing.is_visible,
        seo_title: editing.seo_title.trim(),
        seo_description: editing.seo_description.trim(),
        updated_at: new Date().toISOString(),
      };

      if (editing.id) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert(payload);
        if (error) throw error;
      }

      await revalidateStorefront();
      await fetchCategories();
      setEditing(null);
      setStatusMsg('Category saved & published to storefront.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisible = async (cat: Category) => {
    const supabase = createClient();
    await supabase
      .from('categories')
      .update({ is_visible: !cat.is_visible, updated_at: new Date().toISOString() })
      .eq('id', cat.id);
    await revalidateStorefront();
    fetchCategories();
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    const supabase = createClient();
    if (cat.cloudinary_public_id) {
      await fetch('/api/admin/cloudinary', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id: cat.cloudinary_public_id }),
      }).catch(() => {});
    }
    await supabase.from('categories').delete().eq('id', cat.id);
    await revalidateStorefront();
    fetchCategories();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#0066FF]">
            CATALOGUE STRUCTURE
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">
            Category Management
          </h1>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditing({
              ...EMPTY_CATEGORY,
              display_order: categories.length + 1,
            })
          }
          className="inline-flex items-center gap-2 bg-[#080808] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#0066FF] transition"
        >
          <Plus className="h-4 w-4" /> New Category
        </button>
      </div>

      {statusMsg && (
        <div className="border border-[#0066FF]/30 bg-[#0066FF]/10 px-4 py-3 text-xs font-bold text-[#080808]">
          {statusMsg}
        </div>
      )}

      {/* Editor Modal / Panel */}
      {editing && (
        <form
          onSubmit={handleSave}
          className="border border-[#E5E5E5] bg-white p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
            <h2 className="text-sm font-black uppercase tracking-wider">
              {editing.id ? `Edit Category: ${editing.name}` : 'Create Category'}
            </h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-neutral-400 hover:text-[#080808]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Category Name *
              </label>
              <input
                type="text"
                required
                value={editing.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const autoSlug = !editing.id
                    ? name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '')
                    : editing.slug;
                  setEditing({ ...editing, name, slug: autoSlug });
                }}
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Category Slug *
              </label>
              <input
                type="text"
                required
                value={editing.slug}
                onChange={(e) =>
                  setEditing({ ...editing, slug: e.target.value })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
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

            <div className="flex items-center gap-3 pt-5">
              <input
                type="checkbox"
                id="cat-visible"
                checked={editing.is_visible}
                onChange={(e) =>
                  setEditing({ ...editing, is_visible: e.target.checked })
                }
                className="h-4 w-4 accent-[#080808]"
              />
              <label
                htmlFor="cat-visible"
                className="text-xs font-bold uppercase tracking-wider"
              >
                Enabled / Visible on Storefront
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Category Description
              </label>
              <textarea
                rows={2}
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <CloudinaryUploader
                label="Category Studio Image (Cloudinary)"
                folder="adyora/categories"
                imageUrl={editing.image_url}
                publicId={editing.cloudinary_public_id}
                focalX={editing.image_focal_x}
                focalY={editing.image_focal_y}
                onUploaded={({ public_id, secure_url }) =>
                  setEditing({
                    ...editing,
                    cloudinary_public_id: public_id,
                    image_url: secure_url,
                  })
                }
                onDeleted={() =>
                  setEditing({
                    ...editing,
                    cloudinary_public_id: '',
                    image_url: '',
                  })
                }
                onFocalChange={(fx, fy) =>
                  setEditing({
                    ...editing,
                    image_focal_x: fx,
                    image_focal_y: fy,
                  })
                }
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                SEO Title
              </label>
              <input
                type="text"
                value={editing.seo_title}
                onChange={(e) =>
                  setEditing({ ...editing, seo_title: e.target.value })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                SEO Description
              </label>
              <input
                type="text"
                value={editing.seo_description}
                onChange={(e) =>
                  setEditing({ ...editing, seo_description: e.target.value })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-[#E5E5E5] pt-4">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="border border-[#E5E5E5] px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[#080808] px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#0066FF]"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving...' : 'Save Category'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Categories Table */}
      <div className="border border-[#E5E5E5] bg-white">
        {loading ? (
          <p className="p-8 text-center text-xs text-neutral-500">
            Loading categories...
          </p>
        ) : categories.length === 0 ? (
          <p className="p-8 text-center text-xs text-neutral-500">
            No categories created yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#F4F4F4] text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-[#F4F4F4]/30">
                    <td className="px-4 py-3 font-extrabold">
                      #{cat.display_order}
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-14 w-12 overflow-hidden bg-[#F4F4F4] border border-[#E5E5E5]">
                        {cat.image_url ? (
                          <img
                            src={getOptimizedCloudinaryUrl(cat.image_url, {
                              width: 400,
                            })}
                            alt={cat.name}
                            style={{
                              objectPosition: `${cat.image_focal_x}% ${cat.image_focal_y}%`,
                            }}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[9px] text-neutral-400">
                            None
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold uppercase">{cat.name}</td>
                    <td className="px-4 py-3 text-neutral-500">
                      /categories/{cat.slug}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleVisible(cat)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase ${
                          cat.is_visible
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {cat.is_visible ? (
                          <>
                            <Eye className="h-3 w-3" /> Visible
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" /> Hidden
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditing({ ...cat })}
                        className="inline-flex items-center gap-1 border border-[#E5E5E5] px-2.5 py-1 text-[11px] font-bold hover:border-[#080808]"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        className="inline-flex items-center gap-1 border border-red-200 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
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

