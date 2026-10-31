import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#080808] px-6 text-center text-white">
      <Link href="/" className="mb-8 inline-block">
        <img
          src="/adyora-logo.png"
          alt="ADYORA"
          className="h-10 w-auto object-contain"
        />
      </Link>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#0066FF]">
        404 — DROP NOT FOUND
      </p>
      <h1 className="mt-3 text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
        LOOKS LIKE THIS FIT DOESN&apos;T EXIST.
      </h1>
      <p className="mt-3 max-w-md text-xs text-neutral-400 leading-relaxed">
        The page or product you are looking for has been moved, unlisted, or never dropped.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-[#0066FF] px-6 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-white hover:bg-white hover:text-[#080808] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return Home</span>
        </Link>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 border border-white/20 bg-transparent px-6 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-white hover:bg-white/10 transition-colors"
        >
          <span>Explore Collection</span>
        </Link>
      </div>
    </div>
  );
}
