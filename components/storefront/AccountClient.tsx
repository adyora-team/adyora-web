'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Package,
  MapPin,
  Heart,
  LogOut,
  Plus,
  Trash2,
  FileText,
  Shield,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type {
  CustomerAddress,
  Order,
  Product,
  Profile,
} from '@/types/database';
import { ProductCard } from './ProductCard';

interface AccountClientProps {
  profile: Profile;
  isAdmin: boolean;
  initialOrders: Order[];
  initialAddresses: CustomerAddress[];
  wishlistProducts: Product[];
  currencySymbol?: string;
}

export function AccountClient({
  profile,
  isAdmin,
  initialOrders,
  initialAddresses,
  wishlistProducts,
  currencySymbol = '₹',
}: AccountClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    'orders' | 'addresses' | 'wishlist' | 'profile'
  >('orders');

  const [fullName, setFullName] = useState(profile.full_name || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [addresses, setAddresses] =
    useState<CustomerAddress[]>(initialAddresses);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [addrForm, setAddrForm] = useState({
    label: 'Home',
    full_name: profile.full_name || '',
    phone: profile.phone || '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false,
  });

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;
      setProfileMsg('Profile updated successfully.');
    } catch {
      setProfileMsg('Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('addresses')
        .insert({
          user_id: profile.id,
          ...addrForm,
        })
        .select('*')
        .single();

      if (!error && data) {
        setAddresses([data as CustomerAddress, ...addresses]);
        setShowNewAddress(false);
        setAddrForm({
          label: 'Home',
          full_name: profile.full_name || '',
          phone: profile.phone || '',
          address_line1: '',
          address_line2: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'India',
          is_default: false,
        });
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteAddress = async (id: string) => {
    const supabase = createClient();
    await supabase.from('addresses').delete().eq('id', id);
    setAddresses(addresses.filter((a) => a.id !== id));
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 md:py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-6">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#0066FF]">
            MY ACCOUNT
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#080808]">
            Welcome, {profile.full_name || profile.email}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 bg-[#0066FF] px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#080808] transition"
            >
              <Shield className="h-3.5 w-3.5" /> Admin Dashboard
            </Link>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 border border-[#E5E5E5] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#080808] hover:border-[#080808]"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-[#E5E5E5] pb-4">
        {[
          { key: 'orders' as const, label: 'Orders', icon: Package },
          { key: 'addresses' as const, label: 'Saved Addresses', icon: MapPin },
          { key: 'wishlist' as const, label: 'Wishlist', icon: Heart },
          { key: 'profile' as const, label: 'Profile Settings', icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition ${
                active
                  ? 'bg-[#080808] text-white'
                  : 'bg-[#F4F4F4] text-[#080808] hover:bg-neutral-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {initialOrders.length === 0 ? (
              <div className="border border-[#E5E5E5] bg-[#F4F4F4]/40 py-16 text-center">
                <Package className="mx-auto h-10 w-10 text-neutral-400" />
                <p className="mt-3 text-xs font-extrabold uppercase tracking-wider">
                  No orders placed yet
                </p>
                <Link
                  href="/shop"
                  className="mt-4 inline-block bg-[#080808] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              initialOrders.map((order) => (
                <div
                  key={order.id}
                  className="border border-[#E5E5E5] bg-white p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-[#080808]">
                        Order #{order.order_number}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        Placed on{' '}
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="border border-[#E5E5E5] bg-[#F4F4F4] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                        Order: {order.order_status}
                      </span>
                      <span
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          order.payment_status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        Payment: {order.payment_status}
                      </span>
                      <Link
                        href={`/orders/${order.id}/invoice`}
                        target="_blank"
                        className="inline-flex items-center gap-1 border border-[#080808] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-[#080808] hover:text-white transition"
                      >
                        <FileText className="h-3 w-3" /> Invoice
                      </Link>
                    </div>
                  </div>

                  {order.tracking_number && (
                    <div className="mt-3 bg-[#F4F4F4] px-3.5 py-2 text-xs">
                      <strong>Courier:</strong> {order.courier_name || 'Express'}{' '}
                      | <strong>Tracking ID:</strong> {order.tracking_number}
                    </div>
                  )}

                  <div className="mt-4 divide-y divide-[#E5E5E5]">
                    {(order.order_items || []).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2.5 text-xs"
                      >
                        <div>
                          <span className="font-bold uppercase">
                            {item.product_name}
                          </span>{' '}
                          <span className="text-neutral-500">
                            &times; {item.quantity} ({item.size}{' '}
                            {item.colour && `/ ${item.colour}`})
                          </span>
                        </div>
                        <span className="font-bold">
                          {currencySymbol}
                          {Number(item.line_total).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex justify-between border-t border-[#E5E5E5] pt-3 text-xs font-black">
                    <span>Total Amount</span>
                    <span>
                      {currencySymbol}
                      {Number(order.total_amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'addresses' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider">
                Saved Shipping Addresses
              </h2>
              <button
                type="button"
                onClick={() => setShowNewAddress(!showNewAddress)}
                className="inline-flex items-center gap-1.5 bg-[#080808] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Add Address
              </button>
            </div>

            {showNewAddress && (
              <form
                onSubmit={handleAddAddress}
                className="mb-6 border border-[#E5E5E5] bg-[#F4F4F4]/40 p-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                <input
                  type="text"
                  required
                  placeholder="Full Name *"
                  value={addrForm.full_name}
                  onChange={(e) =>
                    setAddrForm({ ...addrForm, full_name: e.target.value })
                  }
                  className="border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                />
                <input
                  type="tel"
                  required
                  placeholder="Phone Number *"
                  value={addrForm.phone}
                  onChange={(e) =>
                    setAddrForm({ ...addrForm, phone: e.target.value })
                  }
                  className="border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  required
                  placeholder="Address Line 1 *"
                  value={addrForm.address_line1}
                  onChange={(e) =>
                    setAddrForm({ ...addrForm, address_line1: e.target.value })
                  }
                  className="sm:col-span-2 border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  required
                  placeholder="City *"
                  value={addrForm.city}
                  onChange={(e) =>
                    setAddrForm({ ...addrForm, city: e.target.value })
                  }
                  className="border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  required
                  placeholder="State *"
                  value={addrForm.state}
                  onChange={(e) =>
                    setAddrForm({ ...addrForm, state: e.target.value })
                  }
                  className="border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  required
                  placeholder="Postal Code *"
                  value={addrForm.postal_code}
                  onChange={(e) =>
                    setAddrForm({ ...addrForm, postal_code: e.target.value })
                  }
                  className="border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="bg-[#080808] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white"
                  >
                    Save Address
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="flex flex-col justify-between border border-[#E5E5E5] p-4 text-xs"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold uppercase">
                        {addr.full_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-neutral-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-1 text-neutral-600">{addr.phone}</p>
                    <p className="mt-2 text-neutral-700">
                      {addr.address_line1}
                      {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                    </p>
                    <p className="text-neutral-700">
                      {addr.city}, {addr.state} - {addr.postal_code}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div>
            {wishlistProducts.length === 0 ? (
              <div className="border border-[#E5E5E5] bg-[#F4F4F4]/40 py-16 text-center">
                <Heart className="mx-auto h-10 w-10 text-neutral-400" />
                <p className="mt-3 text-xs font-extrabold uppercase tracking-wider">
                  Your wishlist is empty
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {wishlistProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    currencySymbol={currencySymbol}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <form
            onSubmit={handleSaveProfile}
            className="max-w-md space-y-4 border border-[#E5E5E5] p-6"
          >
            <h2 className="text-sm font-black uppercase tracking-wider">
              Profile Details
            </h2>
            {profileMsg && (
              <p className="text-xs font-bold text-[#0066FF]">{profileMsg}</p>
            )}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={profile.email}
                className="mt-1 w-full border border-[#E5E5E5] bg-[#F4F4F4] px-3 py-2 text-xs text-neutral-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="bg-[#080808] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white"
            >
              {savingProfile ? 'Saving...' : 'Update Profile'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

