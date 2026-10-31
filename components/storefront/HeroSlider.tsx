'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { HeroBanner } from '@/types/database';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';

interface HeroSliderProps {
  banners: HeroBanner[];
}

export function HeroSlider({ banners }: HeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const slides: HeroBanner[] =
    banners.length > 0
      ? banners
      : [
          {
            id: 'default-hero',
            heading: 'WEAR YOUR IDENTITY.',
            subheading:
              'Clean fits. Better days. Explore the latest streetwear collection from ADYORA.',
            button_text: 'SHOP COLLECTION',
            button_link: '/shop',
            desktop_public_id: '',
            desktop_image_url: '',
            mobile_public_id: '',
            mobile_image_url: '',
            focal_x: 50,
            focal_y: 35,
            display_order: 1,
            is_visible: true,
            publish_start: null,
            publish_end: null,
            created_at: '',
            updated_at: '',
          },
        ];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const current = slides[activeIndex] || slides[0];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  };

  // Format heading so the final line/word is highlighted in ADYORA electric blue (#007BFF), matching reference
  const renderStyledHeading = (heading: string) => {
    const words = heading.trim().split(/\s+/);
    if (words.length <= 1) {
      return <span className="text-[#007BFF]">{heading}</span>;
    }
    const lastWord = words[words.length - 1];
    const firstWords = words.slice(0, -1);

    return (
      <>
        {firstWords.map((word, idx) => (
          <span key={idx} className="block text-white">
            {word}
          </span>
        ))}
        <span className="block text-[#007BFF]">{lastWord}</span>
      </>
    );
  };

  const desktopImg = current.desktop_image_url
    ? getOptimizedCloudinaryUrl(current.desktop_image_url, { width: 1920 })
    : '';
  const mobileImg = current.mobile_image_url
    ? getOptimizedCloudinaryUrl(current.mobile_image_url, { width: 800 })
    : desktopImg;

  const focalX = current.focal_x ?? 50;
  const focalY =
    current.focal_y !== undefined && current.focal_y !== null
      ? current.focal_y
      : 15;

  return (
    <section
      aria-label="Hero Campaign Banner"
      className="relative w-full overflow-hidden bg-[#111215] text-white"
    >
      <div className="relative w-full h-[calc(100svh-100px)] min-h-[560px] md:min-h-[620px] max-h-[880px] flex items-end md:items-center">
        {/* Responsive Hero Banner Image (<picture> for separate Mobile & Desktop uploads) */}
        {(desktopImg || mobileImg) ? (
          <picture className="absolute inset-0 h-full w-full">
            {desktopImg && (
              <source media="(min-width: 768px)" srcSet={desktopImg} />
            )}
            <img
              src={mobileImg || desktopImg}
              alt={current.heading || 'ADYORA Campaign'}
              style={{
                objectPosition: `${focalX}% ${focalY}%`,
              }}
              className="h-full w-full object-cover"
              fetchPriority="high"
            />
          </picture>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#080808] via-[#15171C] to-[#1E222B]" />
        )}

        {/* Subtle Dark Scrim for Left-Aligned Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20 md:bg-gradient-to-r md:from-black/80 md:via-black/35 md:to-transparent" />

        {/* Top-Right Slide Counter (Desktop Reference: 01 / 03 ——) */}
        <div className="hidden md:flex absolute top-8 right-8 lg:right-12 z-10 items-center gap-3 text-[11px] font-medium tracking-[0.2em] text-white/80">
          <span>
            {String(activeIndex + 1).padStart(2, '0')} /{' '}
            {String(slides.length).padStart(2, '0')}
          </span>
          <span className="h-[1px] w-10 bg-white/60" />
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-12 pt-28 sm:px-8 md:py-16 lg:px-12">
          <div className="max-w-lg">
            <p className="mb-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.38em] text-white/80">
              NEW COLLECTION
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-black uppercase leading-[0.95] tracking-tight">
              {renderStyledHeading(current.heading || 'WEAR YOUR IDENTITY.')}
            </h1>
            {current.subheading && (
              <p className="mt-4 max-w-md text-xs sm:text-sm leading-relaxed text-white/85">
                {current.subheading}
              </p>
            )}
            <div className="mt-6 sm:mt-8">
              <Link
                href={current.button_link || '/shop'}
                className="inline-flex items-center gap-3 bg-white px-6 py-3.5 text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.14em] text-[#080808] transition hover:bg-[#007BFF] hover:text-white"
              >
                <span>{current.button_text || 'SHOP COLLECTION'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom-Right Caption & Circular Slider Controls (Desktop Reference) */}
        <div className="hidden md:flex absolute bottom-8 right-8 lg:right-12 z-10 flex-col items-end gap-4">
          <div className="text-right text-[10px] font-medium uppercase tracking-[0.32em] leading-relaxed text-white/80">
            <p>STREETWEAR</p>
            <p>FOR A HIGHER YOU.</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous slide"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/35 text-white transition hover:border-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next slide"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/35 text-white transition hover:border-white hover:bg-white/10"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bottom Pagination Indicator (Mobile dots + Desktop minimal bar) */}
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 flex items-center gap-2">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`transition-all ${
                idx === activeIndex
                  ? 'h-1.5 w-1.5 rounded-full bg-white md:h-[2px] md:w-8 md:rounded-none'
                  : 'h-1.5 w-1.5 rounded-full bg-white/40 md:h-[2px] md:w-4 md:rounded-none'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

