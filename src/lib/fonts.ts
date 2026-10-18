import localFont from 'next/font/local';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

// Self-hosted: no build-time request to Google Fonts.
// Instrument Serif — editorial headlines (SIL OFL, see fonts/InstrumentSerif-OFL.txt).
export const fontDisplay = localFont({
  src: [
    { path: '../app/fonts/InstrumentSerif-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../app/fonts/InstrumentSerif-Italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-display',
  display: 'swap',
  fallback: ['Times New Roman', 'serif'],
});

// Geist — interface text. Geist Mono — technical metadata, identifiers, numbers.
export const fontSans = GeistSans;
export const fontMono = GeistMono;
