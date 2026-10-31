'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { CmsPage } from '@/types/database';

const EMPTY_PAGE = {
  id: '',
  title: '',
  slug: '',
  content: '',
  seo_title: '',
  seo_description: '',
  is_published: true,
};

export default function AdminPagesCmsPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [editing, setEditing] = useState<typeof EMPTY_PAGE | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const fetchPages = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('pages')
      .select('*')
      .order('title', { ascending: true });
    setPages((data as CmsPage[]) || []);
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setStatusMsg('');

    try {
      const supabase = createClient();
      const slug =
        editing.slug.trim() ||
        editing.title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

      const payload = {
        title: editing.title.trim(),
        slug,
        content: editing.content,
        seo_title: editing.seo_title.trim(),
        seo_description: editing.seo_description.trim(),
        is_published: editing.is_published,
        updated_at: new Date().toISOString(),
      };

      if (editing.id) {
        const { error } = await supabase
          .from('pages')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pages').insert(payload);
        if (error) throw error;
      }

      await fetch('/api/admin/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: ['pages'] }),
      });

      await fetchPages();
      setEditing(null);
      setStatusMsg('Page content saved & published.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this page?')) return;
    const supabase = createClient();
    await supabase.from('pages').delete().eq('id', id);
    fetchPages();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#0066FF]">
            POLICIES & STATIC CONTENT
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">
            Pages & Content CMS
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ ...EMPTY_PAGE })}
          className="inline-flex items-center gap-2 bg-[#080808] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#0066FF]"
        >
          <Plus className="h-4 w-4" /> New Page
        </button>
      </div>

      {statusMsg && (
        <div className="border border-[#0066FF]/30 bg-[#0066FF]/10 px-4 py-3 text-xs font-bold">
          {statusMsg}
        </div>
      )}

      {editing && (
        <form
          onSubmit={handleSave}
          className="border border-[#E5E5E5] bg-white p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
            <h2 className="text-sm font-black uppercase">
              {editing.id ? `Edit Page: ${editing.title}` : 'Create Page'}
            </h2>
            <button type="button" onClick={() => setEditing(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase">
                Page Title *
              </label>
              <input
                type="text"
                required
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase">
                Slug (e.g. shipping-policy, about-us) *
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

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold uppercase">
                Page HTML / Rich Text Content *
              </label>
              <textarea
                rows={10}
                required
                value={editing.content}
                onChange={(e) =>
                  setEditing({ ...editing, content: e.target.value })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase">
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
              <label className="block text-[11px] font-bold uppercase">
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

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.is_published}
                onChange={(e) =>
                  setEditing({ ...editing, is_published: e.target.checked })
                }
                className="h-4 w-4 accent-[#080808]"
              />
              <span className="text-xs font-bold uppercase">Published</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-[#080808] px-6 py-2 text-xs font-bold uppercase text-white"
            >
              <Check className="h-3.5 w-3.5" /> Save Page
            </button>
          </div>
        </form>
      )}

      <div className="border border-[#E5E5E5] bg-white">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E5E5E5] bg-[#F4F4F4] text-[10px] font-bold uppercase tracking-wider text-neutral-600">
              <th className="px-4 py-3">Page Title</th>
              <th className="px-4 py-3">URL Path</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {pages.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-bold uppercase">{p.title}</td>
                <td className="px-4 py-3 text-neutral-500">/pages/{p.slug}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                      p.is_published
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {p.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {new Date(p.updated_at).toLocaleDateString('en-IN')}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditing({ ...p })}
                    className="border border-[#E5E5E5] px-2.5 py-1 font-bold"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
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

