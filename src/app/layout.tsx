import './globals.css';
import type { Metadata } from 'next';
import { fontDisplay, fontSans, fontMono } from '@/lib/fonts';
import { cn } from '@/lib/cn';

export const metadata: Metadata = {
  title: 'Villa Ajloun — Construction Intelligence',
  description: 'A premium digital operating system for the Villa Ajloun project. Ajloun, Jordan.',
};

// Runs before paint → sets the saved theme with no flash of the wrong colors.
const THEME_INIT = `try{var t=localStorage.getItem('va-theme');if(!t){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={cn(fontDisplay.variable, fontSans.variable, fontMono.variable)}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
