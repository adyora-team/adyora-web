'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  User,
  ShoppingBag,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Category, NavigationItem, WebsiteSettings } from '@/types/database';
import { OFFICIAL_ADYORA_LOGO_URL } from '@/lib/cloudinary';
import { useStore } from './StoreContext';
import { CartDrawer } from './CartDrawer';

interface HeaderProps {
  settings: WebsiteSettings;
  navigationItems: NavigationItem[];
  categories: Category[];
}

export function Header({ settings, navigationItems, categories }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { cartCount, setIsCartOpen } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Build navigation list from navigation_items table; if empty, derive from categories table
  const navLinks =
    navigationItems.length > 0
      ? navigationItems.map((item) => ({
          id: item.id,
          label: item.label,
          href: item.href,
        }))
      : [
          { id: 'home', label: 'HOME', href: '/' },
          ...categories.map((cat) => ({
            id: cat.id,
            label: cat.name.toUpperCase(),
            href: `/categories/${cat.slug}`,
          })),
        ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchOpen(false);
    setMobileMenuOpen(false);
    router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const hasAnnouncement = Boolean(
    settings.announcement_visible && settings.announcement_text
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 w-full bg-[#080808]/95 backdrop-blur-md text-white border-b border-white/10 shadow-sm">
        {/* 1. Slim Announcement Bar matching reference */}
        {hasAnnouncement && (
          <div
            style={{
              backgroundColor: settings.announcement_bg_color || '#080808',
              color: settings.announcement_text_color || '#FFFFFF',
            }}
            className="border-b border-white/10 px-4 py-1.5"
          >
            <div className="mx-auto flex max-w-[1440px] items-center justify-between md:justify-center md:gap-16">
              <span className="text-neutral-400" aria-hidden="true">
                <ChevronLeft className="h-3.5 w-3.5" />
              </span>
              <Link
                href={settings.announcement_link || '/shop'}
                className="truncate text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] hover:opacity-90"
              >
                {settings.announcement_text}
              </Link>
              <span className="text-neutral-400" aria-hidden="true">
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        )}

        {/* 2. Main Header Row */}
        <div className="relative mx-auto flex h-14 md:h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Mobile Left: Hamburger Menu */}
          <div className="flex items-center lg:hidden w-9">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 text-white hover:text-[#0066FF] transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Logo (Left on Desktop, Perfectly Centered on Mobile) */}
          <Link
            href="/"
            className="flex items-center justify-center lg:justify-start flex-shrink-0 absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0"
          >
            <img
              src={OFFICIAL_ADYORA_LOGO_URL}
              alt={settings.site_name || 'ADYORA'}
              className="h-7 sm:h-8 md:h-10 w-auto object-contain"
            />
          </Link>

          {/* Desktop Center: Horizontal Category Navigation */}
          <nav
            aria-label="Main category navigation"
            className="hidden lg:flex lg:items-center lg:gap-6 xl:gap-7 h-full"
          >
            {navLinks.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`relative flex h-full items-center text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
                    isActive
                      ? 'text-[#0066FF]'
                      : 'text-white/90 hover:text-white'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0066FF]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Icons: Search, Account, Shopping Bag */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              className="p-1 text-white/90 hover:text-[#0066FF] transition-colors"
              aria-label="Search products"
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </button>

            <Link
              href="/account"
              className="p-1 text-white/90 hover:text-[#0066FF] transition-colors"
              aria-label="Customer account"
            >
              <User className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </Link>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-1 text-white/90 hover:text-[#0066FF] transition-colors"
              aria-label="Shopping bag"
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.8} />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#0066FF] px-1 text-[9px] font-extrabold text-white">
                {cartCount}
              </span>
            </button>
          </div>
        </div>

        {/* Expandable Search Bar */}
        {searchOpen && (
          <div className="border-t border-white/10 bg-[#080808] px-4 py-3">
            <form
              onSubmit={handleSearchSubmit}
              className="mx-auto flex max-w-2xl items-center gap-2"
            >
              <Search className="h-4 w-4 text-neutral-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shirts, tees, jeans, jackets..."
                autoFocus
                className="w-full bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#0066FF] px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="p-1 text-neutral-400 hover:text-white"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Fixed Header Spacer so content starts cleanly below the fixed navbar */}
      <div
        className={hasAnnouncement ? 'h-[85px] md:h-[93px]' : 'h-14 md:h-16'}
        aria-hidden="true"
      />

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full w-4/5 max-w-xs flex-col bg-[#080808] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <img
                src={OFFICIAL_ADYORA_LOGO_URL}
                alt={settings.site_name || 'ADYORA'}
                className="h-7 w-auto object-contain"
              />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-neutral-400 hover:text-white"
                aria-label="Close mobile menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 border-b border-white/10">
              <form onSubmit={handleSearchSubmit} className="flex items-center bg-white/10 px-3 py-2">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ADYORA..."
                  className="w-full bg-transparent text-xs text-white placeholder-neutral-400 focus:outline-none"
                />
                <button type="submit" aria-label="Search">
                  <Search className="h-4 w-4 text-neutral-300" />
                </button>
              </form>
            </div>

            <nav className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-1">
                {navLinks.map((item) => {
                  const isActive =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname.startsWith(item.href);

                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`block py-2.5 text-xs font-bold uppercase tracking-[0.14em] border-b border-white/5 ${
                          isActive ? 'text-[#0066FF]' : 'text-white/90'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="border-t border-white/10 px-5 py-4 space-y-2 text-xs">
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-1.5 font-semibold uppercase tracking-wider text-neutral-300 hover:text-white"
              >
                <User className="h-4 w-4" /> My Account & Orders
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Cart Drawer */}
      <CartDrawer currencySymbol={settings.currency_symbol || '₹'} />
    </>
  );
}

