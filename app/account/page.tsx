import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { StorefrontShell } from '@/components/storefront/StorefrontShell';
import { AccountClient } from '@/components/storefront/AccountClient';
import { getWebsiteSettings } from '@/lib/cms';
import type { CustomerAddress, Order, Product, Profile } from '@/types/database';

export default async function AccountPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/account');
  }

  const [
    settings,
    { data: profileRow },
    { data: roleRow },
    { data: orders },
    { data: addresses },
    { data: wishlistRow },
  ] = await Promise.all([
    getWebsiteSettings(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_roles').select('role').eq('user_id', user.id).single(),
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('wishlists')
      .select('id, wishlist_items(product_id)')
      .eq('user_id', user.id)
      .single(),
  ]);

  let wishlistProducts: Product[] = [];
  const wishProductIds = Array.isArray(wishlistRow?.wishlist_items)
    ? wishlistRow.wishlist_items.map((w: { product_id: string }) => w.product_id)
    : [];

  if (wishProductIds.length > 0) {
    const { data: prods } = await supabase
      .from('products')
      .select(
        'id, name, slug, sku, selling_price, original_price, stock_quantity, sizes, colours, is_published, product_images(id, image_url, alt_text, display_order, focal_x, focal_y)'
      )
      .in('id', wishProductIds)
      .eq('is_published', true);
    if (prods) {
      wishlistProducts = prods as unknown as Product[];
    }
  }

  const profile: Profile = (profileRow as Profile) || {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || '',
    phone: user.user_metadata?.phone || '',
    avatar_url: '',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <StorefrontShell>
      <AccountClient
        profile={profile}
        isAdmin={roleRow?.role === 'admin'}
        initialOrders={(orders as Order[]) || []}
        initialAddresses={(addresses as CustomerAddress[]) || []}
        wishlistProducts={wishlistProducts}
        currencySymbol={settings.currency_symbol || '₹'}
      />
    </StorefrontShell>
  );
}

