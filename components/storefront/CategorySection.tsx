import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Category } from '@/types/database';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';

interface CategorySectionProps {
  title?: string;
  categories: Category[];
}

export function CategorySection({
  title = 'SHOP BY CATEGORY',
  categories,
}: CategorySectionProps) {
  return (
    <section className="bg-white py-10 sm:py-12 md:py-14">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-6 sm:mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight text-[#080808]">
              {title}
            </h2>
            <div className="mt-2 h-[2px] w-8 bg-neutral-300" />
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#080808] hover:text-[#0066FF] transition-colors"
          >
            <span>VIEW ALL</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Category Grid: 3 cols on mobile, 9 cols on desktop matching reference */}
        {categories.length === 0 ? (
          <div className="border border-[#E5E5E5] bg-[#F4F4F4]/50 p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              No categories published yet. Configure categories in Admin &rarr; Categories.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5 sm:gap-3.5">
            {categories.map((cat) => {
              const optimizedImg = cat.image_url
                ? getOptimizedCloudinaryUrl(cat.image_url, {
                    width: 400,
                  })
                : '';

              return (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  className="group block"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#EFEFEF]">
                    {optimizedImg ? (
                      <img
                        src={optimizedImg}
                        alt={cat.name}
                        loading="lazy"
                        className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-[#F4F4F4] p-2 text-center transition-colors group-hover:bg-neutral-200/70">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-neutral-400">
                          {cat.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="mt-2.5 text-center text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#080808] group-hover:text-[#0066FF] transition-colors">
                    {cat.name}
                  </h3>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

