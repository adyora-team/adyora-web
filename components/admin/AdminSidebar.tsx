'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  FolderKanban,
  Home,
  Compass,
  PanelBottom,
  Settings,
  ClipboardList,
  Users,
  TicketPercent,
  FileText,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { OFFICIAL_ADYORA_LOGO_URL } from '@/lib/cloudinary';

const ADMIN_NAV = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Products', href: '/admin/products', icon: ShoppingBag },
  { label: 'Categories', href: '/admin/categories', icon: FolderKanban },
  { label: 'Homepage CMS', href: '/admin/homepage', icon: Home },
  { label: 'Navigation', href: '/admin/navigation', icon: Compass },
  { label: 'Footer CMS', href: '/admin/footer', icon: PanelBottom },
  { label: 'Website Settings', href: '/admin/settings', icon: Settings },
  { label: 'Orders', href: '/admin/orders', icon: ClipboardList },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Coupons', href: '/admin/coupons', icon: TicketPercent },
  { label: 'Pages & Policies', href: '/admin/pages', icon: FileText },
];

export function AdminSidebar({ adminEmail }: { adminEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navContent = (
    <div className="flex h-full flex-col bg-[#080808] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <div>
          <img
            src={OFFICIAL_ADYORA_LOGO_URL}
            alt="ADYORA"
            className="h-8 w-auto object-contain"
          />
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
            ADMIN CMS
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-neutral-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                isActive
                  ? 'bg-[#0066FF] text-white'
                  : 'text-neutral-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4 space-y-2">
        <p className="truncate text-[11px] text-neutral-400">{adminEmail}</p>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300 hover:text-[#0066FF]"
        >
          <ExternalLink className="h-3.5 w-3.5" /> View Live Storefront
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 pt-1 text-xs font-bold uppercase tracking-wider text-red-400 hover:text-red-300"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="flex items-center justify-between bg-[#080808] px-4 py-3 text-white lg:hidden">
        <img
          src={OFFICIAL_ADYORA_LOGO_URL}
          alt="ADYORA ADMIN"
          className="h-7 w-auto object-contain"
        />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-1 text-white"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-64">{navContent}</div>
        </div>
      )}
    </>
  );
}

