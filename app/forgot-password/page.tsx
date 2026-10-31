'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { OFFICIAL_ADYORA_LOGO_URL } from '@/lib/cloudinary';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/account`,
        }
      );

      if (resetErr) {
        setError(resetErr.message);
      } else {
        setMessage(
          'Password reset instructions have been sent to your email address.'
        );
      }
    } catch {
      setError('Failed to send reset link.');
    } finally {
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
            Reset Password
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            Enter your registered email to receive a password reset link.
          </p>
        </div>

        {error && (
          <div className="mt-5 border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-5 border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            {message}
          </div>
        )}

        <form onSubmit={handleReset} className="mt-6 space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white py-3.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#080808] transition hover:bg-[#0066FF] hover:text-white disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 border-t border-white/10 pt-5 text-center text-xs text-neutral-400">
          <Link
            href="/login"
            className="font-bold uppercase tracking-wider text-white hover:text-[#0066FF]"
          >
            &larr; Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

