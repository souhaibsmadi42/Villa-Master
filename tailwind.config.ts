import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        cream:  'var(--c-cream)',
        sand:   'var(--c-sand)',
        stone:  'var(--c-stone)',
        bark:   'var(--c-bark)',
        ink:    'var(--c-ink)',
        olive:  'var(--c-olive)',
        'olive-mist': 'var(--c-olive-mist)',
        sun:    'var(--c-sun)',
        iron:   'var(--c-iron)',
        brass:  'var(--c-brass)',
        amber:  'var(--c-amber)',
        surface:   'var(--c-surface)',
        'surface-2': 'var(--c-surface-2)',
        'surface-3': 'var(--c-surface-3)',
        border:    'var(--c-border)',
        'border-2': 'var(--c-border-2)',
        text:      'var(--c-text)',
        'text-2':  'var(--c-text-2)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Cormorant Garamond', 'serif'],
        sans:    ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        chip:  '10px',
        card:  '16px',
        panel: '24px',
        hero:  '32px',
      },
      boxShadow: {
        e1: 'var(--e1)',
        e2: 'var(--e2)',
        e3: 'var(--e3)',
        e4: 'var(--e4)',
        e5: 'var(--e5)',
        ring: 'inset 0 0 0 1px rgba(74,55,40,.08)',
      },
      transitionTimingFunction: {
        glide:     'cubic-bezier(.22,.61,.36,1)',
        swoop:     'cubic-bezier(.16,1,.3,1)',
        cinematic: 'cubic-bezier(.85,0,.15,1)',
      },
      transitionDuration: {
        tap: '120ms', glide: '280ms', swoop: '480ms', cinematic: '900ms',
      },
      letterSpacing: {
        eyebrow: '0.18em',
        tightish: '-0.01em',
        tighter:  '-0.02em',
      },
    },
  },
  plugins: [],
} satisfies Config;
