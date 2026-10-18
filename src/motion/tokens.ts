// Single source of truth for motion timing. Mirrors the CSS variables in globals.css.
export const ease = {
  glide: [0.22, 0.61, 0.36, 1] as const,      // UI state changes
  swoop: [0.16, 1, 0.3, 1] as const,          // entrances
  cinematic: [0.76, 0, 0.24, 1] as const,     // scene transitions
};

export const duration = {
  tap: 0.12,
  quick: 0.18,
  glide: 0.28,
  swoop: 0.52,
  cinematic: 1.1,
};

export const spring = {
  // drawers, sheets, palettes — restrained, no visible bounce
  panel: { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 } as const,
  // small elements, pills, indicators
  snappy: { type: 'spring', stiffness: 520, damping: 36 } as const,
  // magnetic / pointer-follow
  soft: { type: 'spring', stiffness: 160, damping: 22, mass: 0.6 } as const,
};

export const stagger = { tight: 0.04, base: 0.07, loose: 0.12 };
