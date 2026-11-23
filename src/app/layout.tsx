import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en" className="dark">
      <body className="bg-obsidian text-textPrimary font-sans antialiased h-screen overflow-hidden flex flex-col">
        {children}
      </body>
    </html>
  );
}
