'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface LocalCartItem {
  key: string;
  productId: string;
  variantId?: string | null;
  name: string;
  slug: string;
  sku: string;
  price: number;
  originalPrice?: number | null;
  imageUrl: string;
  size: string;
  colour: string;
  quantity: number;
  maxStock: number;
}

interface StoreContextValue {
  cart: LocalCartItem[];
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (item: Omit<LocalCartItem, 'key'>) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
  wishlistIds: string[];
  toggleWishlist: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const CART_STORAGE_KEY = 'adyora_cart_v1';
const WISHLIST_STORAGE_KEY = 'adyora_wishlist_v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<LocalCartItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) setCart(JSON.parse(savedCart));
      const savedWish = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (savedWish) setWishlistIds(JSON.parse(savedWish));
    } catch {
      // ignore storage parse error
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
    } catch {
      // ignore
    }
  }, [wishlistIds, hydrated]);

  const addToCart = (item: Omit<LocalCartItem, 'key'>) => {
    const key = `${item.productId}__${item.size || 'default'}__${item.colour || 'default'}`;
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key
            ? {
                ...i,
                quantity: Math.min(i.maxStock || 99, i.quantity + item.quantity),
              }
            : i
        );
      }
      return [...prev, { ...item, key }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (key: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(key);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.key === key
          ? { ...item, quantity: Math.min(item.maxStock || 99, quantity) }
          : item
      )
    );
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleWishlist = async (productId: string) => {
    const exists = wishlistIds.includes(productId);
    const updated = exists
      ? wishlistIds.filter((id) => id !== productId)
      : [...wishlistIds, productId];
    setWishlistIds(updated);

    // Sync with Supabase if authenticated
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let { data: wishlist } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!wishlist) {
        const { data: created } = await supabase
          .from('wishlists')
          .insert({ user_id: user.id })
          .select('id')
          .single();
        wishlist = created;
      }

      if (wishlist?.id) {
        if (exists) {
          await supabase
            .from('wishlist_items')
            .delete()
            .eq('wishlist_id', wishlist.id)
            .eq('product_id', productId);
        } else {
          await supabase
            .from('wishlist_items')
            .upsert(
              { wishlist_id: wishlist.id, product_id: productId },
              { onConflict: 'wishlist_id,product_id' }
            );
        }
      }
    } catch {
      // silent fallback to localStorage
    }
  };

  const isWishlisted = (productId: string) => wishlistIds.includes(productId);

  const cartCount = hydrated
    ? cart.reduce((acc, item) => acc + item.quantity, 0)
    : 0;
  const cartSubtotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  return (
    <StoreContext.Provider
      value={{
        cart,
        cartCount,
        cartSubtotal,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        wishlistIds,
        toggleWishlist,
        isWishlisted,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used inside a StoreProvider');
  }
  return ctx;
}

