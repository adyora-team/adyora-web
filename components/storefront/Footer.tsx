import React from 'react';
import Link from 'next/link';
import type { Category, FooterSettings } from '@/types/database';
import { OFFICIAL_ADYORA_LOGO_URL } from '@/lib/cloudinary';

interface FooterProps {
  footer: FooterSettings;
  categories: Category[];
}

export function Footer({ footer, categories }: FooterProps) {
  if (!footer.is_visible) return null;

  return (
    <footer className="bg-[#080808] text-white border-t border-white/10">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="inline-block">
              <img
                src={OFFICIAL_ADYORA_LOGO_URL}
                alt="ADYORA"
                className="h-9 sm:h-10 w-auto object-contain"
              />
            </Link>
            {footer.footer_description && (
              <p className="mt-4 max-w-sm text-xs leading-relaxed text-neutral-400">
                {footer.footer_description}
              </p>
            )}

            {/* Contact Info */}
            <div className="mt-6 space-y-1.5 text-xs text-neutral-300">
              {footer.email_address && (
                <p>
                  <span className="text-neutral-500 uppercase tracking-wider text-[10px] mr-2">
                    Email:
                  </span>
                  <a
                    href={`mailto:${footer.email_address}`}
                    className="hover:text-[#0066FF]"
                  >
                    {footer.email_address}
                  </a>
                </p>
              )}
              {footer.whatsapp_number && (
                <p>
                  <span className="text-neutral-500 uppercase tracking-wider text-[10px] mr-2">
                    WhatsApp:
                  </span>
                  <a
                    href={`https://wa.me/${footer.whatsapp_number.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#0066FF]"
                  >
                    {footer.whatsapp_number}
                  </a>
                </p>
              )}
              {footer.address && (
                <p className="text-neutral-400 text-[11px] pt-1">
                  {footer.address}
                </p>
              )}
            </div>

            {/* Social Media Links */}
            <div className="mt-6 flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
              {footer.instagram_url && (
                <a
                  href={footer.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-400 hover:text-[#0066FF]"
                >
                  Instagram
                </a>
              )}
              {footer.facebook_url && (
                <a
                  href={footer.facebook_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-400 hover:text-[#0066FF]"
                >
                  Facebook
                </a>
              )}
              {footer.youtube_url && (
                <a
                  href={footer.youtube_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-400 hover:text-[#0066FF]"
                >
                  YouTube
                </a>
              )}
            </div>
          </div>

          {/* Categories Column */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">
              Categories
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-neutral-400">
              {categories.slice(0, 9).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/categories/${cat.slug}`}
                    className="hover:text-white transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation Column */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">
              Explore
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-neutral-400">
              {(footer.navigation_links || []).map((item, idx) => (
                <li key={idx}>
                  <Link
                    href={item.href}
                    className="hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/account"
                  className="hover:text-white transition-colors"
                >
                  My Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies Column */}
          <div className="col-span-2 sm:col-span-1">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">
              Policies & Legal
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-neutral-400">
              {(footer.policy_links || []).map((item, idx) => (
                <li key={idx}>
                  <Link
                    href={item.href}
                    className="hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row text-[11px] text-neutral-400">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <p>
              {footer.copyright_text || `© ${new Date().getFullYear()} ADYORA. All rights reserved.`}
            </p>
            <span className="hidden sm:inline text-neutral-600">|</span>
            <p>
              Crafted by{' '}
              <a
                href="https://ekodrix.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-white hover:text-[#0066FF] transition-colors underline decoration-white/20 underline-offset-4 hover:decoration-[#0066FF]"
              >
                Ekodrix
              </a>
            </p>
          </div>

          {Array.isArray(footer.payment_method_icons) &&
            footer.payment_method_icons.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {footer.payment_method_icons.map((method, idx) => (
                  <span
                    key={idx}
                    className="border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-300"
                  >
                    {method}
                  </span>
                ))}
              </div>
            )}
        </div>
      </div>
    </footer>
  );
}

