import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/components/storefront/StoreContext';
import { PreloaderIntro } from '@/components/storefront/PreloaderIntro';
import { getWebsiteSettings } from '@/lib/cms';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getWebsiteSettings();
  return {
    title: {
      default:
        settings.default_seo_title ||
        'ADYORA — Premium Contemporary Streetwear & Fashion',
      template: `%s | ${settings.site_name || 'ADYORA'}`,
    },
    description:
      settings.default_seo_description ||
      'Clean fits. Better days. Explore the latest contemporary streetwear collection from ADYORA.',
    icons: settings.favicon_url
      ? { icon: settings.favicon_url }
      : undefined,
    openGraph: {
      title:
        settings.default_seo_title ||
        'ADYORA — Premium Contemporary Streetwear & Fashion',
      description:
        settings.default_seo_description ||
        'Clean fits. Better days. Explore the latest contemporary streetwear collection from ADYORA.',
      images: settings.og_image_url ? [settings.og_image_url] : undefined,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Instant pre-paint check: guarantees 0ms flash of website before loader on return visits */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(sessionStorage.getItem('adyora_intro_seen')){document.documentElement.classList.add('intro-already-seen');}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-white font-sans text-[#080808] antialiased">
        <StoreProvider>
          <PreloaderIntro />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
