import type { Metadata } from 'next';
import { PRODUCT_NAME, PRODUCT_TAGLINE } from '@studio/shared';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: PRODUCT_TAGLINE,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      {/* suppressHydrationWarning: browser extensions often inject attrs on <body>. */}
      <body
        className="min-h-full font-sans antialiased"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>

  );
}
