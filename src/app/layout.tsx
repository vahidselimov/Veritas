import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VERITAS // CORPUS — Engineering Grounded Research AI',
  description:
    'Visual Grounded Deep Research AI platform with deterministic PDF sub-pixel bounding box verification and hybrid RRF retrieval.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <body className="bg-obsidian text-textPrimary font-sans antialiased h-screen overflow-hidden flex flex-col">
        {children}
      </body>
    </html>
  );
}
