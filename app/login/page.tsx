'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { OFFICIAL_ADYORA_LOGO_URL } from '@/lib/cloudinary';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr) {
        setError(signInErr.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const { data: roleRow } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .single();

        if (roleRow?.role === 'admin' && nextUrl === '/account') {
          router.push('/admin');
          router.refresh();
          return;
        }
      }

      router.push(nextUrl);
      router.refresh();
    } catch {
      setError('Authentication error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col justify-center px-4 py-12 text-white">
      <div className="mx-auto w-full max-w-md border border-white/15 bg-[#111215] p-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <img
              src={OFFICIAL_ADYORA_LOGO_URL}
              alt="ADYORA"
              className="mx-auto h-10 w-auto object-contain"
            />
          </Link>
          <h1 className="mt-4 text-xl font-black uppercase tracking-wider">
            Sign In to Your Account
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            Access your orders, saved addresses, and wishlist.
          </p>
        </div>

        {error && (
          <div className="mt-5 border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full border border-white/20 bg-black/50 px-3.5 py-2.5 text-xs text-white focus:border-[#0066FF] focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[11px] text-[#0066FF] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full border border-white/20 bg-black/50 px-3.5 py-2.5 text-xs text-white focus:border-[#0066FF] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white py-3.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#080808] transition hover:bg-[#0066FF] hover:text-white disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 border-t border-white/10 pt-5 text-center text-xs text-neutral-400">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-bold uppercase tracking-wider text-white hover:text-[#0066FF]"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080808]" />}>
      <LoginForm />
    </Suspense>
  );
}

