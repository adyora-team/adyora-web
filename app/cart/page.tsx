import React from 'react';
import { StorefrontShell } from '@/components/storefront/StorefrontShell';
import { CartPageClient } from '@/components/storefront/CartPageClient';
import { getWebsiteSettings } from '@/lib/cms';

export default async function CartPage() {
  const settings = await getWebsiteSettings();
  return (
    <StorefrontShell>
      <CartPageClient
        currencySymbol={settings.currency_symbol || '₹'}
        freeShippingThreshold={Number(settings.free_shipping_threshold || 1999)}
        shippingFlatRate={Number(settings.shipping_flat_rate || 0)}
      />
    </StorefrontShell>
  );
}

