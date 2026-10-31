import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/components/storefront/StoreContext';
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
      <body className="min-h-screen bg-white font-sans text-[#080808] antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
