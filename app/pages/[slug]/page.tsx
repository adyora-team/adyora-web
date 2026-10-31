import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StorefrontShell } from '@/components/storefront/StorefrontShell';
import { getPublishedPageBySlug } from '@/lib/cms';

const DEFAULT_PAGE_FALLBACKS: Record<
  string,
  { title: string; content: string }
> = {
  'about-us': {
    title: 'About Us',
    content:
      '<h2>About ADYORA</h2><p>ADYORA is a contemporary streetwear and fashion brand defined by clean silhouettes, heavyweight fabrics, and modern urban utility.</p>',
  },
  'contact-us': {
    title: 'Contact Us',
    content:
      '<h2>Contact ADYORA</h2><p>For order assistance, sizing queries, or press inquiries, reach out to our customer support team via email or WhatsApp.</p>',
  },
  faqs: {
    title: 'Frequently Asked Questions',
    content:
      '<h2>FAQs</h2><p>Orders are dispatched within 24–48 hours with real-time courier tracking. Prepaid orders qualify for free shipping.</p>',
  },
  'shipping-policy': {
    title: 'Shipping Policy',
    content:
      '<h2>Shipping Policy</h2><p>All ADYORA orders are processed within 1–2 business days and delivered nationwide via insured express courier partners.</p>',
  },
  'return-policy': {
    title: 'Return & Exchange Policy',
    content:
      '<h2>Return Policy</h2><p>We offer a hassle-free 7-day return and size exchange window on unworn items with original tags intact.</p>',
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    content:
      '<h2>Privacy Policy</h2><p>ADYORA respects your privacy and protects all customer data with strict encryption and access controls.</p>',
  },
  'terms-and-conditions': {
    title: 'Terms and Conditions',
    content:
      '<h2>Terms & Conditions</h2><p>By using the ADYORA website and placing an order, you agree to our standard terms of service and conditions of sale.</p>',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedPageBySlug(slug);
  const fallback = DEFAULT_PAGE_FALLBACKS[slug];
  if (!page && !fallback) {
    return { title: 'Page Not Found' };
  }
  return {
    title: page?.seo_title || page?.title || fallback?.title,
    description: page?.seo_description || undefined,
  };
}

export default async function CmsContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPublishedPageBySlug(slug);
  const fallback = DEFAULT_PAGE_FALLBACKS[slug];

  if (!page && !fallback) {
    notFound();
  }

  const title = page?.title || fallback.title;
  const htmlContent = page?.content || fallback.content;

  return (
    <StorefrontShell>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 md:py-16">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#0066FF]">
          ADYORA INFORMATION
        </p>
        <h1 className="mt-2 text-2xl sm:text-4xl font-black uppercase tracking-tight text-[#080808]">
          {title}
        </h1>
        <div className="mt-3 h-[2px] w-10 bg-[#080808]" />
        <div
          className="prose prose-sm mt-8 max-w-none text-xs sm:text-sm leading-relaxed text-neutral-700 [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-black [&_h2]:uppercase [&_h2]:text-[#080808] [&_p]:mb-4"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </StorefrontShell>
  );
}

