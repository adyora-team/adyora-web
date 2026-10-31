import React from 'react';
import { StorefrontShell } from '@/components/storefront/StorefrontShell';
import { CheckoutClient } from '@/components/storefront/CheckoutClient';
import { getWebsiteSettings } from '@/lib/cms';

export default async function CheckoutPage() {
  const settings = await getWebsiteSettings();
  return (
    <StorefrontShell>
      <CheckoutClient settings={settings} />
    </StorefrontShell>
  );
}

