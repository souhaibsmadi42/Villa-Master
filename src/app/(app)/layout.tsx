import './globals.css';
import type { Metadata } from 'next';
import { fontDisplay, fontSans, fontMono } from '@/lib/fonts';
import { cn } from '@/lib/cn';

export const metadata: Metadata = {
  title: 'Villa Ajloun — Construction Intelligence',
  description: 'A premium digital operating system for the Villa Ajloun project. Ajloun, Jordan.',
};

const THEME_INIT = `try{var t=localStorage.getItem('va-theme');if(!t){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}`;

const THEME_WIRE = `(function(){function paint(){var dark=document.documentElement.getAttribute('data-theme')==='dark';var b=document.getElementById('vaThemeBtn');if(b)b.textContent=dark?'☀':'☾';}function init(){var b=document.getElementById('vaThemeBtn');if(b&&!b.dataset.wired){b.dataset.wired='1';b.addEventListener('click',function(){var cur=document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';var next=cur==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',next);try{localStorage.setItem('va-theme',next);}catch(e){}paint();});}paint();}if(document.readyState!=='loading')init();else document.addEventListener('DOMContentLoaded',init);})();`;

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
        <button
          id="vaThemeBtn"
          aria-label="Toggle dark / light theme"
          style={{
            position: 'fixed', bottom: '20px', left: '20px', zIndex: 2147483000,
            width: '46px', height: '46px', borderRadius: '50%',
            border: '1px solid var(--glass-stroke)', background: 'var(--c-surface)',
            color: 'var(--c-text)', boxShadow: '0 8px 24px rgba(74,55,40,0.20)',
            cursor: 'pointer', fontSize: '19px', lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ☾
        </button>
        <script dangerouslySetInnerHTML={{ __html: THEME_WIRE }} />
      </body>
    </html>
  );
}