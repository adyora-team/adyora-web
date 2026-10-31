import React from 'react';
import {
  getFooterSettings,
  getNavigationItems,
  getVisibleCategories,
  getWebsiteSettings,
} from '@/lib/cms';
import { Header } from './Header';
import { Footer } from './Footer';

export async function StorefrontShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, navigationItems, categories, footer] = await Promise.all([
    getWebsiteSettings(),
    getNavigationItems(),
    getVisibleCategories(),
    getFooterSettings(),
  ]);

  if (settings.maintenance_mode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#080808] px-6 text-center text-white">
        {settings.logo_url ? (
          <img
            src={settings.logo_url}
            alt={settings.site_name}
            className="mb-8 h-12 w-auto object-contain"
          />
        ) : (
          <h1 className="mb-6 text-3xl font-black italic text-[#0066FF]">
            {settings.site_name || 'ADYORA'}
          </h1>
        )}
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#0066FF]">
          SCHEDULED DROP PREPARATION
        </p>
        <h2 className="mt-3 text-2xl sm:text-3xl font-black uppercase tracking-tight">
          WE WILL BE RIGHT BACK.
        </h2>
        <p className="mt-3 max-w-md text-xs text-neutral-400 leading-relaxed">
          The ADYORA storefront is currently undergoing scheduled updates. Please check back shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#080808]">
      <Header
        settings={settings}
        navigationItems={navigationItems}
        categories={categories}
      />
      <main className="flex-1">{children}</main>
      <Footer footer={footer} categories={categories} />
    </div>
  );
}

