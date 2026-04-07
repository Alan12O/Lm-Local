// Light and dark color palettes + shadow definitions

export type ThemeColors = typeof COLORS_LIGHT;

interface ShadowStyle {
  boxShadow: string;
}

export type ThemeShadows = {
  small: ShadowStyle;
  medium: ShadowStyle;
  large: ShadowStyle;
  glow: ShadowStyle;
};

// ── Light palette ──────────────────────────────────────────────────
export const COLORS_LIGHT = {
  // Primary accent (Crimson Red)
  primary: '#D32F2F',
  primaryDark: '#B71C1C',
  primaryLight: '#EF5350',

  // Backgrounds
  background: '#FFFFFF',
  surface: '#FDFCFB',
  surfaceLight: '#F5F4F0',
  surfaceHover: '#EBEAE4',

  // Text hierarchy
  text: '#0A0A0A',
  textSecondary: '#525252',
  textMuted: '#8A8A8A',
  textDisabled: '#BFBFBF',

  // Borders
  border: 'rgba(0,0,0,0.12)',
  borderLight: 'rgba(0,0,0,0.08)',
  borderFocus: '#D32F2F',

  // Semantic colors
  success: '#525252',
  warning: '#0A0A0A',
  error: '#DC2626',
  errorBackground: 'rgba(220, 38, 38, 0.10)',
  info: '#525252',

  // Special
  overlay: 'rgba(0, 0, 0, 0.4)',
  divider: '#EBEBEB',
};

// ── Dark palette ───────────────────────────────────────────────────
export const COLORS_DARK = {
  // Primary accent (Crimson Red)
  primary: '#EF5350',
  primaryDark: '#D32F2F',
  primaryLight: '#E57373',

  // Backgrounds (Warm Blacks)
  background: '#1A1A1A',
  surface: '#222222',
  surfaceLight: '#2C2C2C',
  surfaceHover: '#363636',

  // Text hierarchy
  text: '#F1EFE8',
  textSecondary: '#D4D2CB',
  textMuted: '#A6A49E',
  textDisabled: '#6E6D68',

  // Borders
  border: 'rgba(255,255,255,0.1)',
  borderLight: 'rgba(255,255,255,0.06)',
  borderFocus: '#EF5350',

  // Semantic colors
  success: '#B0B0B0',
  warning: '#FFFFFF',
  error: '#C75050',
  errorBackground: 'rgba(239, 68, 68, 0.15)',
  info: '#B0B0B0',

  // Special
  overlay: 'rgba(0, 0, 0, 0.7)',
  divider: '#1A1A1A',
};

// ── Light shadows ────────────────────────────────────────────────────
// Uses CSS boxShadow (RN 0.76+ with New Architecture) for cross-platform
// shadow rendering. Works identically on iOS and Android.
export const SHADOWS_LIGHT: ThemeShadows = {
  small: {
    boxShadow: '0px 1px 8px 0px rgba(0,0,0,0.18)',
  },
  medium: {
    boxShadow: '0px 2px 10px 0px rgba(0,0,0,0.22)',
  },
  large: {
    boxShadow: '0px 4px 18px 0px rgba(0,0,0,0.35)',
  },
  glow: {
    boxShadow: '0px 0px 12px 0px rgba(37,99,235,0.25)',
  },
};

// ── Dark shadows (crisp white glow for depth) ───────────────────────
export const SHADOWS_DARK: ThemeShadows = {
  small: {
    boxShadow: '0px 0px 6px 0px rgba(255,255,255,0.18)',
  },
  medium: {
    boxShadow: '0px 0px 6px 0px rgba(255,255,255,0.20)',
  },
  large: {
    boxShadow: '0px 0px 10px 0px rgba(255,255,255,0.25)',
  },
  glow: {
    boxShadow: '0px 0px 8px 0px rgba(96,165,250,0.30)',
  },
};

// ── Elevation factory ──────────────────────────────────────────────
export function createElevation(colors: ThemeColors) {
  return {
    level0: {
      backgroundColor: colors.background,
      borderWidth: 0,
      borderColor: 'transparent',
    },
    level1: {
      backgroundColor: colors.surface,
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    level2: {
      backgroundColor: colors.surfaceLight,
      borderWidth: 0.5,
      borderColor: colors.borderLight,
    },
    level3: {
      backgroundColor: `${colors.surface}F2`,
      borderTopWidth: 0.5,
      borderColor: colors.borderLight,
      borderRadius: 16,
      blur: {
        ios: { blurAmount: 10, blurType: colors.background === '#0A0A0A' ? 'dark' : 'light' },
        android: { overlayColor: colors.overlay },
      },
    },
    level4: {
      backgroundColor: `${colors.surface}FA`,
      borderTopWidth: 0.5,
      borderColor: colors.primary,
      borderRadius: 16,
      blur: {
        ios: { blurAmount: 15, blurType: colors.background === '#0A0A0A' ? 'dark' : 'light' },
        android: { overlayColor: colors.overlay },
      },
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: colors.textMuted,
      borderRadius: 2,
      alignSelf: 'center' as const,
    },
  } as const;
}
