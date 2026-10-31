'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { OFFICIAL_ADYORA_LOGO_URL } from '@/lib/cloudinary';

export function PreloaderIntro() {
  const [show, setShow] = useState<boolean>(true);
  const [fading, setFading] = useState<boolean>(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('adyora_intro_seen')) {
        setShow(false);
        return;
      }
    } catch {
      // ignore
    }

    // 1.2s of logo reveal + sleek electric-blue progress bar
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 1250);

    // 500ms smooth curtain fade-out
    const exitTimer = setTimeout(() => {
      setShow(false);
      try {
        sessionStorage.setItem('adyora_intro_seen', 'true');
        document.documentElement.classList.add('intro-already-seen');
      } catch {
        // ignore
      }
    }, 1750);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(exitTimer);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      id="adyora-preloader"
      aria-hidden="true"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#080808] transition-all duration-500 ease-out select-none ${
        fading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background ambient radial blue glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,102,255,0.18)_0%,rgba(8,8,8,0)_65%)] pointer-events-none" />

      {/* Centered Brand Experience */}
      <div className="relative z-10 flex flex-col items-center px-6">
        {/* Animated ADYORA Metallic Logo */}
        <div className="relative flex items-center justify-center">
          <img
            src="/adyora-logo.png"
            alt="ADYORA"
            width={280}
            height={90}
            className="h-16 sm:h-20 md:h-24 w-auto object-contain animate-preloader-logo drop-shadow-[0_0_24px_rgba(0,102,255,0.6)]"
          />
        </div>

        {/* Minimal Sub-brand Tagline */}
        <p className="mt-5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.45em] text-white/70">
          CONTEMPORARY STREETWEAR
        </p>

        {/* High-Precision Loading Line */}
        <div className="mt-6 h-[2px] w-32 sm:w-40 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-gradient-to-r from-[#0066FF] via-[#3385FF] to-[#0066FF] animate-preloader-bar shadow-[0_0_10px_#0066FF]" />
        </div>
      </div>
    </div>
  );
}

