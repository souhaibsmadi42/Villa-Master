import './globals.css';
import type { Metadata, Viewport } from 'next';
import { fontDisplay, fontSans, fontMono } from '@/lib/fonts';
import { cn } from '@/lib/cn';
import { Providers } from '@/components/providers/Providers';

export const metadata: Metadata = {
  title: { default: 'Villa Master — Villa Ajloun', template: '%s · Villa Master' },
  description: 'The project intelligence layer for Villa Ajloun — programme, contractors, deliverables, model and decisions in one place.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F5F0' },
    { media: '(prefers-color-scheme: dark)', color: '#101110' },
  ],
};

// Runs before paint: applies the saved theme and marks returning visitors
// so the opening sequence is skipped — no flash, no hydration mismatch.
const BOOT = `try{var d=document.documentElement,t=localStorage.getItem('va-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}d.setAttribute('data-theme',t);if(localStorage.getItem('vm-intro-seen'))d.setAttribute('data-intro','skip');}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={cn(fontDisplay.variable, fontSans.variable, fontMono.variable)}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
