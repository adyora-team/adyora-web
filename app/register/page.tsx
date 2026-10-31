'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { OFFICIAL_ADYORA_LOGO_URL } from '@/lib/cloudinary';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (signUpErr) {
        setError(signUpErr.message);
        setLoading(false);
        return;
      }

      // Trigger Brevo welcome email server-side
      fetch('/api/auth/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: fullName.trim(),
        }),
      }).catch(() => {});

      if (data.session) {
        router.push('/account');
        router.refresh();
      } else {
        setSuccessMsg(
          'Account created! Please check your email inbox to verify your address before signing in.'
        );
        setLoading(false);
      }
    } catch {
      setError('Could not complete registration.');
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
            Create Your Account
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            Join ADYORA for faster checkout and order tracking.
          </p>
        </div>

        {error && (
          <div className="mt-5 border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mt-5 border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="mt-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1.5 w-full border border-white/20 bg-black/50 px-3.5 py-2.5 text-xs text-white focus:border-[#0066FF] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 w-full border border-white/20 bg-black/50 px-3.5 py-2.5 text-xs text-white focus:border-[#0066FF] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300">
              Email Address *
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
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300">
              Password (min 6 characters) *
            </label>
            <input
              type="password"
              required
              minLength={6}
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
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 border-t border-white/10 pt-5 text-center text-xs text-neutral-400">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-bold uppercase tracking-wider text-white hover:text-[#0066FF]"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

