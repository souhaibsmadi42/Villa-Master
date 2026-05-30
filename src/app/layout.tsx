import './globals.css';
import type { Metadata } from 'next';
import { fontDisplay, fontSans, fontMono } from '@/lib/fonts';
import { cn } from '@/lib/cn';

export const metadata: Metadata = {
  title: 'Villa Ajloun — Construction Intelligence',
  description: 'A premium digital operating system for the Villa Ajloun project. Ajloun, Jordan.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={cn(fontDisplay.variable, fontSans.variable, fontMono.variable)}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
