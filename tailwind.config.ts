import type { Config } from 'tailwindcss';

// All colours resolve to CSS variables in globals.css (RGB channels),
// so a single token drives both themes and opacity modifiers work.
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // brand constants
        obsidian: token('obsidian'), charcoal: token('charcoal'), limestone: token('limestone'),
        chalk: token('chalk'), stone: token('stone'), olive: token('olive'), bronze: token('bronze'),
        // semantic
        canvas: token('canvas'), surface: token('surface'), raised: token('raised'), sunken: token('sunken'),
        line: token('line'), 'line-strong': token('line-strong'),
        ink: token('ink'), 'ink-2': token('ink-2'), muted: token('muted'), faint: token('faint'),
        accent: token('accent'), success: token('success'), warning: token('warning'),
        critical: token('critical'), info: token('info'),
        primary: token('primary'), 'on-primary': token('on-primary'),
      },
      fontFamily: {
        display: ['var(--font-display)', 'Times New Roman', 'serif'],
        sans:    ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        chip: '6px', card: '10px', panel: '14px', hero: '20px',
      },
      boxShadow: {
        e1: 'var(--e1)', e2: 'var(--e2)', e3: 'var(--e3)', e4: 'var(--e4)', e5: 'var(--e5)',
        highlight: 'var(--highlight)',
      },
      transitionTimingFunction: {
        glide: 'cubic-bezier(.22,.61,.36,1)',
        swoop: 'cubic-bezier(.16,1,.3,1)',
        cinematic: 'cubic-bezier(.76,0,.24,1)',
      },
      transitionDuration: {
        tap: '120ms', quick: '180ms', glide: '280ms', swoop: '520ms', cinematic: '1100ms',
      },
      letterSpacing: {
        eyebrow: '0.14em', tightish: '-0.01em', tighter: '-0.02em',
      },
      maxWidth: { content: '1320px' },
    },
  },
  plugins: [],
} satisfies Config;
