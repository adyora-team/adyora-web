'use client';

import React, { useEffect, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { FooterSettings } from '@/types/database';
import { DEFAULT_FOOTER_SETTINGS } from '@/lib/cms';

export default function AdminFooterCmsPage() {
  const [footer, setFooter] = useState<FooterSettings>(DEFAULT_FOOTER_SETTINGS);
  const [paymentIconsInput, setPaymentIconsInput] = useState(
    DEFAULT_FOOTER_SETTINGS.payment_method_icons.join(', ')
  );
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('footer_settings')
        .select('*')
        .eq('singleton_key', 'default')
        .single();
      if (data) {
        setFooter({ ...DEFAULT_FOOTER_SETTINGS, ...data });
        if (Array.isArray(data.payment_method_icons)) {
          setPaymentIconsInput(data.payment_method_icons.join(', '));
        }
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
      const icons = paymentIconsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const { error } = await supabase.from('footer_settings').upsert(
        {
          singleton_key: 'default',
          footer_logo_public_id: footer.footer_logo_public_id,
          footer_logo_url: footer.footer_logo_url,
          footer_description: footer.footer_description,
          whatsapp_number: footer.whatsapp_number,
          email_address: footer.email_address,
          address: footer.address,
          instagram_url: footer.instagram_url,
          facebook_url: footer.facebook_url,
          youtube_url: footer.youtube_url,
          navigation_links: footer.navigation_links,
          policy_links: footer.policy_links,
          copyright_text: footer.copyright_text,
          payment_method_icons: icons,
          is_visible: footer.is_visible,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'singleton_key' }
      );

      if (error) throw error;

      await fetch('/api/admin/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: ['footer'] }),
      });

      setStatusMsg('Footer CMS updated & published.');
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
            GLOBAL FOOTER
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">
            Footer CMS
          </h1>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#080808] px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#0066FF]"
        >
          <Check className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Footer'}</span>
        </button>
      </div>

      {statusMsg && (
        <div className="border border-[#0066FF]/30 bg-[#0066FF]/10 px-4 py-3 text-xs font-bold">
          {statusMsg}
        </div>
      )}

      <div className="border border-[#E5E5E5] bg-white p-6 space-y-6">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="footer-vis"
            checked={footer.is_visible}
            onChange={(e) =>
              setFooter({ ...footer, is_visible: e.target.checked })
            }
            className="h-4 w-4 accent-[#080808]"
          />
          <label
            htmlFor="footer-vis"
            className="text-xs font-bold uppercase tracking-wider"
          >
            Display Footer on Storefront
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Footer Brand Description
            </label>
            <textarea
              rows={2}
              value={footer.footer_description}
              onChange={(e) =>
                setFooter({ ...footer, footer_description: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Support Email Address
            </label>
            <input
              type="email"
              value={footer.email_address}
              onChange={(e) =>
                setFooter({ ...footer, email_address: e.target.value })
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
              value={footer.whatsapp_number}
              onChange={(e) =>
                setFooter({ ...footer, whatsapp_number: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Physical Address
            </label>
            <input
              type="text"
              value={footer.address}
              onChange={(e) => setFooter({ ...footer, address: e.target.value })}
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Instagram URL
            </label>
            <input
              type="url"
              value={footer.instagram_url}
              onChange={(e) =>
                setFooter({ ...footer, instagram_url: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Facebook URL
            </label>
            <input
              type="url"
              value={footer.facebook_url}
              onChange={(e) =>
                setFooter({ ...footer, facebook_url: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              YouTube URL
            </label>
            <input
              type="url"
              value={footer.youtube_url}
              onChange={(e) =>
                setFooter({ ...footer, youtube_url: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Payment Method Badges (comma separated)
            </label>
            <input
              type="text"
              value={paymentIconsInput}
              onChange={(e) => setPaymentIconsInput(e.target.value)}
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold uppercase text-neutral-600">
              Copyright Text
            </label>
            <input
              type="text"
              value={footer.copyright_text}
              onChange={(e) =>
                setFooter({ ...footer, copyright_text: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
            />
          </div>
        </div>

        {/* Navigation & Policy Links */}
        <div className="grid grid-cols-1 gap-6 border-t border-[#E5E5E5] pt-6 md:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase">
                Explore / Navigation Links
              </h3>
              <button
                type="button"
                onClick={() =>
                  setFooter({
                    ...footer,
                    navigation_links: [
                      ...(footer.navigation_links || []),
                      { label: 'New Link', href: '/' },
                    ],
                  })
                }
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0066FF]"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {(footer.navigation_links || []).map((link, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => {
                      const next = [...footer.navigation_links];
                      next[idx] = { ...link, label: e.target.value };
                      setFooter({ ...footer, navigation_links: next });
                    }}
                    placeholder="Label"
                    className="w-1/2 border border-[#E5E5E5] px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={link.href}
                    onChange={(e) => {
                      const next = [...footer.navigation_links];
                      next[idx] = { ...link, href: e.target.value };
                      setFooter({ ...footer, navigation_links: next });
                    }}
                    placeholder="/pages/..."
                    className="w-1/2 border border-[#E5E5E5] px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFooter({
                        ...footer,
                        navigation_links: footer.navigation_links.filter(
                          (_, i) => i !== idx
                        ),
                      })
                    }
                    className="text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase">
                Policy & Legal Links
              </h3>
              <button
                type="button"
                onClick={() =>
                  setFooter({
                    ...footer,
                    policy_links: [
                      ...(footer.policy_links || []),
                      { label: 'Policy', href: '/pages/' },
                    ],
                  })
                }
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0066FF]"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {(footer.policy_links || []).map((link, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => {
                      const next = [...footer.policy_links];
                      next[idx] = { ...link, label: e.target.value };
                      setFooter({ ...footer, policy_links: next });
                    }}
                    placeholder="Label"
                    className="w-1/2 border border-[#E5E5E5] px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={link.href}
                    onChange={(e) => {
                      const next = [...footer.policy_links];
                      next[idx] = { ...link, href: e.target.value };
                      setFooter({ ...footer, policy_links: next });
                    }}
                    placeholder="/pages/..."
                    className="w-1/2 border border-[#E5E5E5] px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFooter({
                        ...footer,
                        policy_links: footer.policy_links.filter(
                          (_, i) => i !== idx
                        ),
                      })
                    }
                    className="text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

