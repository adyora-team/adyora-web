'use client';

import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { WebsiteSettings } from '@/types/database';
import { DEFAULT_WEBSITE_SETTINGS } from '@/lib/cms';
import { CloudinaryUploader } from '@/components/admin/CloudinaryUploader';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<WebsiteSettings>(
    DEFAULT_WEBSITE_SETTINGS
  );
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('website_settings')
        .select('*')
        .eq('singleton_key', 'default')
        .single();
      if (data) {
        setSettings({ ...DEFAULT_WEBSITE_SETTINGS, ...data });
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg('');
    try {
      const supabase = createClient();
      const { id: _unusedId, ...payload } = settings;
      void _unusedId;

      const { error } = await supabase.from('website_settings').upsert(
        {
          ...payload,
          singleton_key: 'default',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'singleton_key' }
      );
      if (error) throw error;

      await fetch('/api/admin/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: ['settings'] }),
      });

      setStatusMsg('Website settings saved & applied across storefront.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#0066FF]">
            GLOBAL STORE CONFIGURATION
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">
            Website Settings
          </h1>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#080808] px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#0066FF]"
        >
          <Check className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
        </button>
      </div>

      {statusMsg && (
        <div className="border border-[#0066FF]/30 bg-[#0066FF]/10 px-4 py-3 text-xs font-bold">
          {statusMsg}
        </div>
      )}

      {/* Brand Identity & Favicon */}
      <div className="border border-[#E5E5E5] bg-white p-6 space-y-5">
        <h2 className="text-sm font-black uppercase tracking-wider border-b border-[#E5E5E5] pb-3">
          1. Brand Identity, Favicon & Social Share Image
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Website Name
            </label>
            <input
              type="text"
              value={settings.site_name}
              onChange={(e) =>
                setSettings({ ...settings, site_name: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Heading Font Family
            </label>
            <input
              type="text"
              value={settings.heading_font}
              onChange={(e) =>
                setSettings({ ...settings, heading_font: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Body Font Family
            </label>
            <input
              type="text"
              value={settings.body_font}
              onChange={(e) =>
                setSettings({ ...settings, body_font: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <CloudinaryUploader
            label="Favicon"
            folder="adyora/logo"
            imageUrl={settings.favicon_url}
            publicId={settings.favicon_public_id}
            aspectRatioClass="h-16 w-16"
            onUploaded={({ public_id, secure_url }) =>
              setSettings({
                ...settings,
                favicon_public_id: public_id,
                favicon_url: secure_url,
              })
            }
          />

          <CloudinaryUploader
            label="Open Graph Share Image"
            folder="adyora/logo"
            imageUrl={settings.og_image_url}
            publicId={settings.og_image_public_id}
            aspectRatioClass="aspect-video w-40"
            onUploaded={({ public_id, secure_url }) =>
              setSettings({
                ...settings,
                og_image_public_id: public_id,
                og_image_url: secure_url,
              })
            }
          />
        </div>

        {/* Brand Colours */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 border-t border-[#E5E5E5] pt-4 text-xs">
          <div>
            <span className="block font-bold uppercase">Primary BG</span>
            <input
              type="color"
              value={settings.primary_bg_color}
              onChange={(e) =>
                setSettings({ ...settings, primary_bg_color: e.target.value })
              }
              className="mt-1 h-8 w-16"
            />
          </div>
          <div>
            <span className="block font-bold uppercase">Primary Text</span>
            <input
              type="color"
              value={settings.primary_text_color}
              onChange={(e) =>
                setSettings({ ...settings, primary_text_color: e.target.value })
              }
              className="mt-1 h-8 w-16"
            />
          </div>
          <div>
            <span className="block font-bold uppercase">Secondary BG</span>
            <input
              type="color"
              value={settings.secondary_bg_color}
              onChange={(e) =>
                setSettings({ ...settings, secondary_bg_color: e.target.value })
              }
              className="mt-1 h-8 w-16"
            />
          </div>
          <div>
            <span className="block font-bold uppercase">Brand Accent</span>
            <input
              type="color"
              value={settings.brand_accent_color}
              onChange={(e) =>
                setSettings({ ...settings, brand_accent_color: e.target.value })
              }
              className="mt-1 h-8 w-16"
            />
          </div>
          <div>
            <span className="block font-bold uppercase">Border Colour</span>
            <input
              type="color"
              value={settings.border_color}
              onChange={(e) =>
                setSettings({ ...settings, border_color: e.target.value })
              }
              className="mt-1 h-8 w-16"
            />
          </div>
        </div>
      </div>

      {/* Currency, Tax & Shipping */}
      <div className="border border-[#E5E5E5] bg-white p-6 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider border-b border-[#E5E5E5] pb-3">
          2. Currency, Tax & Shipping Rules
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Currency Code
            </label>
            <input
              type="text"
              value={settings.currency_code}
              onChange={(e) =>
                setSettings({ ...settings, currency_code: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Currency Symbol
            </label>
            <input
              type="text"
              value={settings.currency_symbol}
              onChange={(e) =>
                setSettings({ ...settings, currency_symbol: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Tax Percentage (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={settings.tax_percentage}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  tax_percentage: Number(e.target.value),
                })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Flat Shipping Rate (₹)
            </label>
            <input
              type="number"
              step="0.01"
              value={settings.shipping_flat_rate}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  shipping_flat_rate: Number(e.target.value),
                })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Free Shipping Above (₹)
            </label>
            <input
              type="number"
              step="0.01"
              value={settings.free_shipping_threshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  free_shipping_threshold: Number(e.target.value),
                })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Contact, SEO, Analytics & Maintenance */}
      <div className="border border-[#E5E5E5] bg-white p-6 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider border-b border-[#E5E5E5] pb-3">
          3. Contact, SEO Defaults, Analytics & Store Status
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Contact Email
            </label>
            <input
              type="email"
              value={settings.contact_email}
              onChange={(e) =>
                setSettings({ ...settings, contact_email: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Contact Phone
            </label>
            <input
              type="text"
              value={settings.contact_phone}
              onChange={(e) =>
                setSettings({ ...settings, contact_phone: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              WhatsApp Number
            </label>
            <input
              type="text"
              value={settings.whatsapp_number}
              onChange={(e) =>
                setSettings({ ...settings, whatsapp_number: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Default SEO Title
            </label>
            <input
              type="text"
              value={settings.default_seo_title}
              onChange={(e) =>
                setSettings({ ...settings, default_seo_title: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Google Analytics ID
            </label>
            <input
              type="text"
              placeholder="G-XXXXXXXXXX"
              value={settings.google_analytics_id}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  google_analytics_id: e.target.value,
                })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Default SEO Description
            </label>
            <input
              type="text"
              value={settings.default_seo_description}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  default_seo_description: e.target.value,
                })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Meta Pixel ID
            </label>
            <input
              type="text"
              value={settings.meta_pixel_id}
              onChange={(e) =>
                setSettings({ ...settings, meta_pixel_id: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 border-t border-[#E5E5E5] pt-4 text-xs font-bold uppercase">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.store_open}
              onChange={(e) =>
                setSettings({ ...settings, store_open: e.target.checked })
              }
              className="h-4 w-4 accent-[#080808]"
            />
            <span>Store Open for Orders</span>
          </label>

          <label className="flex items-center gap-2 text-red-600">
            <input
              type="checkbox"
              checked={settings.maintenance_mode}
              onChange={(e) =>
                setSettings({ ...settings, maintenance_mode: e.target.checked })
              }
              className="h-4 w-4 accent-red-600"
            />
            <span>Enable Maintenance Mode</span>
          </label>
        </div>
      </div>
    </form>
  );
}

