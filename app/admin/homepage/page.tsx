'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type {
  HeroBanner,
  HomepageSection,
  HomepageSectionType,
  WebsiteSettings,
} from '@/types/database';
import { CloudinaryUploader } from '@/components/admin/CloudinaryUploader';
import { DEFAULT_WEBSITE_SETTINGS } from '@/lib/cms';

const EMPTY_HERO = {
  id: '',
  heading: 'WEAR YOUR IDENTITY.',
  subheading:
    'Clean fits. Better days. Explore the latest streetwear collection from ADYORA.',
  button_text: 'SHOP COLLECTION',
  button_link: '/shop',
  desktop_public_id: '',
  desktop_image_url: '',
  mobile_public_id: '',
  mobile_image_url: '',
  focal_x: 50,
  focal_y: 15,
  display_order: 1,
  is_visible: true,
  publish_start: '',
  publish_end: '',
};

const EMPTY_SECTION = {
  id: '',
  section_key: '',
  section_type: 'new_arrivals' as HomepageSectionType,
  title: 'NEW ARRIVALS',
  subtitle: '',
  button_text: 'VIEW ALL',
  button_link: '/shop',
  banner_public_id: '',
  banner_image_url: '',
  background_color: '#FFFFFF',
  text_color: '#080808',
  items_limit: 10,
  display_order: 1,
  is_visible: true,
};

export default function AdminHomepageCmsPage() {
  const [settings, setSettings] = useState<WebsiteSettings>(
    DEFAULT_WEBSITE_SETTINGS
  );
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [editingBanner, setEditingBanner] = useState<typeof EMPTY_HERO | null>(
    null
  );
  const [editingSection, setEditingSection] = useState<
    typeof EMPTY_SECTION | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const fetchAll = async () => {
    const supabase = createClient();
    const [{ data: ws }, { data: hb }, { data: hs }] = await Promise.all([
      supabase
        .from('website_settings')
        .select('*')
        .eq('singleton_key', 'default')
        .single(),
      supabase
        .from('hero_banners')
        .select('*')
        .order('display_order', { ascending: true }),
      supabase
        .from('homepage_sections')
        .select('*')
        .order('display_order', { ascending: true }),
    ]);

    if (ws) setSettings({ ...DEFAULT_WEBSITE_SETTINGS, ...ws });
    setBanners((hb as HeroBanner[]) || []);
    setSections((hs as HomepageSection[]) || []);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const revalidate = async () => {
    await fetch('/api/admin/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: ['hero', 'homepage', 'settings'] }),
    }).catch(() => {});
  };

  const handleSaveAnnouncementAndLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg('');
    try {
      const supabase = createClient();
      const { error } = await supabase.from('website_settings').upsert(
        {
          singleton_key: 'default',
          site_name: settings.site_name,
          logo_public_id: settings.logo_public_id,
          logo_url: settings.logo_url,
          announcement_text: settings.announcement_text,
          announcement_visible: settings.announcement_visible,
          announcement_bg_color: settings.announcement_bg_color,
          announcement_text_color: settings.announcement_text_color,
          announcement_link: settings.announcement_link,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'singleton_key' }
      );
      if (error) throw error;
      await revalidate();
      setStatusMsg('Announcement bar & header logo updated.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;
    setSaving(true);
    setStatusMsg('');
    try {
      const supabase = createClient();
      const payload = {
        heading: editingBanner.heading,
        subheading: editingBanner.subheading,
        button_text: editingBanner.button_text,
        button_link: editingBanner.button_link,
        desktop_public_id: editingBanner.desktop_public_id,
        desktop_image_url: editingBanner.desktop_image_url,
        mobile_public_id: editingBanner.mobile_public_id,
        mobile_image_url: editingBanner.mobile_image_url,
        focal_x: Number(editingBanner.focal_x) || 50,
        focal_y: Number(editingBanner.focal_y) || 50,
        display_order: Number(editingBanner.display_order) || 1,
        is_visible: editingBanner.is_visible,
        publish_start: editingBanner.publish_start || null,
        publish_end: editingBanner.publish_end || null,
        updated_at: new Date().toISOString(),
      };

      if (editingBanner.id) {
        const { error } = await supabase
          .from('hero_banners')
          .update(payload)
          .eq('id', editingBanner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hero_banners').insert(payload);
        if (error) throw error;
      }

      await revalidate();
      await fetchAll();
      setEditingBanner(null);
      setStatusMsg('Hero banner saved.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBanner = async (b: HeroBanner) => {
    if (!confirm('Delete this hero slide?')) return;
    const supabase = createClient();
    await supabase.from('hero_banners').delete().eq('id', b.id);
    await revalidate();
    fetchAll();
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    setSaving(true);
    setStatusMsg('');
    try {
      const supabase = createClient();
      const key =
        editingSection.section_key.trim() ||
        `${editingSection.section_type}_${Date.now()}`;

      const payload = {
        section_key: key,
        section_type: editingSection.section_type,
        title: editingSection.title,
        subtitle: editingSection.subtitle,
        button_text: editingSection.button_text,
        button_link: editingSection.button_link,
        banner_public_id: editingSection.banner_public_id,
        banner_image_url: editingSection.banner_image_url,
        background_color: editingSection.background_color || '#FFFFFF',
        text_color: editingSection.text_color || '#080808',
        items_limit: Number(editingSection.items_limit) || 10,
        display_order: Number(editingSection.display_order) || 1,
        is_visible: editingSection.is_visible,
        updated_at: new Date().toISOString(),
      };

      if (editingSection.id) {
        const { error } = await supabase
          .from('homepage_sections')
          .update(payload)
          .eq('id', editingSection.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('homepage_sections')
          .insert(payload);
        if (error) throw error;
      }

      await revalidate();
      await fetchAll();
      setEditingSection(null);
      setStatusMsg('Homepage section saved.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (s: HomepageSection) => {
    if (!confirm(`Delete homepage section "${s.title}"?`)) return;
    const supabase = createClient();
    await supabase.from('homepage_sections').delete().eq('id', s.id);
    await revalidate();
    fetchAll();
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#0066FF]">
          STOREFRONT EDITOR
        </p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">
          Homepage CMS
        </h1>
      </div>

      {statusMsg && (
        <div className="border border-[#0066FF]/30 bg-[#0066FF]/10 px-4 py-3 text-xs font-bold">
          {statusMsg}
        </div>
      )}

      {/* 1. Announcement Bar */}
      <form
        onSubmit={handleSaveAnnouncementAndLogo}
        className="border border-[#E5E5E5] bg-white p-6 space-y-5"
      >
        <h2 className="text-sm font-black uppercase tracking-wider border-b border-[#E5E5E5] pb-3">
          1. Announcement Bar
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
              Announcement Bar Text
            </label>
            <input
              type="text"
              value={settings.announcement_text}
              onChange={(e) =>
                setSettings({ ...settings, announcement_text: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
              Announcement Link
            </label>
            <input
              type="text"
              value={settings.announcement_link}
              onChange={(e) =>
                setSettings({ ...settings, announcement_link: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="ann-vis"
              checked={settings.announcement_visible}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  announcement_visible: e.target.checked,
                })
              }
              className="h-4 w-4 accent-[#080808]"
            />
            <label htmlFor="ann-vis" className="text-xs font-bold uppercase">
              Show Announcement Bar
            </label>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase">BG Colour:</label>
            <input
              type="color"
              value={settings.announcement_bg_color}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  announcement_bg_color: e.target.value,
                })
              }
              className="h-8 w-12 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase">Text Colour:</label>
            <input
              type="color"
              value={settings.announcement_text_color}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  announcement_text_color: e.target.value,
                })
              }
              className="h-8 w-12 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#080808] px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#0066FF]"
          >
            Save Announcement Bar
          </button>
        </div>
      </form>

      {/* 2. Hero Banners Slider */}
      <div className="border border-[#E5E5E5] bg-white p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <h2 className="text-sm font-black uppercase tracking-wider">
            2. Responsive Hero Banners (Desktop & Mobile Uploads)
          </h2>
          <button
            type="button"
            onClick={() =>
              setEditingBanner({
                ...EMPTY_HERO,
                display_order: banners.length + 1,
              })
            }
            className="inline-flex items-center gap-1.5 bg-[#080808] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0066FF]"
          >
            <Plus className="h-3.5 w-3.5" /> Add Hero Slide
          </button>
        </div>

        {editingBanner && (
          <form
            onSubmit={handleSaveBanner}
            className="border border-[#E5E5E5] bg-[#F4F4F4]/40 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider">
                {editingBanner.id ? 'Edit Hero Slide' : 'New Hero Slide'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingBanner(null)}
                className="text-neutral-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-[11px] font-bold uppercase">
                  Hero Heading
                </label>
                <input
                  type="text"
                  required
                  value={editingBanner.heading}
                  onChange={(e) =>
                    setEditingBanner({
                      ...editingBanner,
                      heading: e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase">
                  Subheading / Description
                </label>
                <input
                  type="text"
                  value={editingBanner.subheading}
                  onChange={(e) =>
                    setEditingBanner({
                      ...editingBanner,
                      subheading: e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase">
                  CTA Button Text
                </label>
                <input
                  type="text"
                  value={editingBanner.button_text}
                  onChange={(e) =>
                    setEditingBanner({
                      ...editingBanner,
                      button_text: e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase">
                  CTA Destination URL
                </label>
                <input
                  type="text"
                  value={editingBanner.button_link}
                  onChange={(e) =>
                    setEditingBanner({
                      ...editingBanner,
                      button_link: e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                />
              </div>

              <div>
                <CloudinaryUploader
                  label="Desktop Hero Banner (16:9 Wide)"
                  folder="adyora/hero"
                  imageUrl={editingBanner.desktop_image_url}
                  publicId={editingBanner.desktop_public_id}
                  focalX={editingBanner.focal_x}
                  focalY={editingBanner.focal_y}
                  aspectRatioClass="aspect-video w-56"
                  onUploaded={({ public_id, secure_url }) =>
                    setEditingBanner({
                      ...editingBanner,
                      desktop_public_id: public_id,
                      desktop_image_url: secure_url,
                    })
                  }
                  onFocalChange={(fx, fy) =>
                    setEditingBanner({
                      ...editingBanner,
                      focal_x: fx,
                      focal_y: fy,
                    })
                  }
                />
              </div>

              <div>
                <CloudinaryUploader
                  label="Mobile Hero Banner (4:5 Portrait)"
                  folder="adyora/hero"
                  imageUrl={editingBanner.mobile_image_url}
                  publicId={editingBanner.mobile_public_id}
                  focalX={editingBanner.focal_x}
                  focalY={editingBanner.focal_y}
                  aspectRatioClass="aspect-[4/5] w-36"
                  onUploaded={({ public_id, secure_url }) =>
                    setEditingBanner({
                      ...editingBanner,
                      mobile_public_id: public_id,
                      mobile_image_url: secure_url,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase">
                  Slider Order
                </label>
                <input
                  type="number"
                  value={editingBanner.display_order}
                  onChange={(e) =>
                    setEditingBanner({
                      ...editingBanner,
                      display_order: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center gap-3 pt-5">
                <input
                  type="checkbox"
                  checked={editingBanner.is_visible}
                  onChange={(e) =>
                    setEditingBanner({
                      ...editingBanner,
                      is_visible: e.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-[#080808]"
                />
                <span className="text-xs font-bold uppercase">
                  Published / Active
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase">
                  Schedule Start (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={editingBanner.publish_start}
                  onChange={(e) =>
                    setEditingBanner({
                      ...editingBanner,
                      publish_start: e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase">
                  Schedule End (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={editingBanner.publish_end}
                  onChange={(e) =>
                    setEditingBanner({
                      ...editingBanner,
                      publish_end: e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 bg-[#080808] px-5 py-2 text-xs font-bold uppercase text-white"
              >
                <Check className="h-3.5 w-3.5" /> Save Slide
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-[#E5E5E5]">
          {banners.length === 0 ? (
            <p className="py-4 text-xs text-neutral-500">
              No custom hero slides added yet (using default ADYORA hero typography).
            </p>
          ) : (
            banners.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-4 py-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-extrabold">#{b.display_order}</span>
                  <div>
                    <p className="font-bold uppercase">{b.heading}</p>
                    <p className="text-neutral-500">{b.subheading}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                      b.is_visible
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {b.is_visible ? 'Visible' : 'Hidden'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingBanner({
                        ...b,
                        publish_start: b.publish_start
                          ? b.publish_start.slice(0, 16)
                          : '',
                        publish_end: b.publish_end
                          ? b.publish_end.slice(0, 16)
                          : '',
                      })
                    }
                    className="border border-[#E5E5E5] px-2.5 py-1 font-bold"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBanner(b)}
                    className="border border-red-200 px-2.5 py-1 text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Homepage Sections Ordering & Visibility */}
      <div className="border border-[#E5E5E5] bg-white p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <h2 className="text-sm font-black uppercase tracking-wider">
            3. Homepage Sections (Order, Visibility & Styling)
          </h2>
          <button
            type="button"
            onClick={() =>
              setEditingSection({
                ...EMPTY_SECTION,
                display_order: sections.length + 1,
              })
            }
            className="inline-flex items-center gap-1.5 bg-[#080808] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0066FF]"
          >
            <Plus className="h-3.5 w-3.5" /> Add Section
          </button>
        </div>

        {editingSection && (
          <form
            onSubmit={handleSaveSection}
            className="border border-[#E5E5E5] bg-[#F4F4F4]/40 p-5 space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-[11px] font-bold uppercase">
                  Section Type
                </label>
                <select
                  value={editingSection.section_type}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      section_type: e.target.value as HomepageSectionType,
                    })
                  }
                  className="mt-1 w-full border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                >
                  <option value="categories">Categories Grid</option>
                  <option value="new_arrivals">New Arrivals Grid</option>
                  <option value="featured_products">Featured Products</option>
                  <option value="best_sellers">Best Sellers</option>
                  <option value="sale_products">Sale Products</option>
                  <option value="promo_banner">Promotional Banner</option>
                  <option value="custom_text">Custom Text Block</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase">
                  Section Title
                </label>
                <input
                  type="text"
                  required
                  value={editingSection.title}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      title: e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={editingSection.subtitle}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      subtitle: e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase">
                  Display Order
                </label>
                <input
                  type="number"
                  value={editingSection.display_order}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      display_order: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase">
                  Max Items to Display
                </label>
                <input
                  type="number"
                  value={editingSection.items_limit}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      items_limit: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center gap-4 pt-5">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase">
                  <input
                    type="checkbox"
                    checked={editingSection.is_visible}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        is_visible: e.target.checked,
                      })
                    }
                  />
                  Visible
                </label>
                <label className="flex items-center gap-1 text-xs">
                  BG:
                  <input
                    type="color"
                    value={editingSection.background_color}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        background_color: e.target.value,
                      })
                    }
                    className="h-6 w-8"
                  />
                </label>
                <label className="flex items-center gap-1 text-xs">
                  Text:
                  <input
                    type="color"
                    value={editingSection.text_color}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        text_color: e.target.value,
                      })
                    }
                    className="h-6 w-8"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="border border-[#E5E5E5] bg-white px-4 py-1.5 text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#080808] px-5 py-1.5 text-xs font-bold uppercase text-white"
              >
                Save Section
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-[#E5E5E5]">
          {sections.map((sec) => (
            <div
              key={sec.id}
              className="flex items-center justify-between py-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-extrabold">#{sec.display_order}</span>
                <div>
                  <span className="font-bold uppercase">{sec.title}</span>{' '}
                  <span className="text-neutral-400">({sec.section_type})</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase ${
                    sec.is_visible
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-neutral-200 text-neutral-600'
                  }`}
                >
                  {sec.is_visible ? (
                    <>
                      <Eye className="h-3 w-3" /> Visible
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3 w-3" /> Hidden
                    </>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingSection({ ...sec })}
                  className="border border-[#E5E5E5] px-2.5 py-1 font-bold"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSection(sec)}
                  className="border border-red-200 px-2.5 py-1 text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

