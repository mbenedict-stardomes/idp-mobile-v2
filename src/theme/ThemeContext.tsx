import React, { createContext, useContext, useMemo } from 'react';
import { colors, gradients, overlays } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, iconSizes, buttonSizes, inputSizes } from './spacing';
import { shadows } from './shadows';

export type ThemeMode = 'dark' | 'light';

export interface SemanticTheme {
  background: string;
  surface: string;
  surfaceLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
}

const darkTheme: SemanticTheme = {
  background:    '#0A0B25',
  surface:       '#1E1F57',
  surfaceLight:  '#2A2B6B',
  textPrimary:   '#FFFFFF',
  textSecondary: '#B2EBF2',
  textMuted:     '#9E9FBB',
  border:        '#3A3B7B',
  divider:       '#2A2B6B',
};

const lightTheme: SemanticTheme = {
  background:    '#FAFAFA',
  surface:       '#FFFFFF',
  surfaceLight:  '#F5F5F5',
  textPrimary:   '#1E1F57',
  textSecondary: '#616161',
  textMuted:     '#999999',
  border:        '#E6E6E6',
  divider:       '#E6E6E6',
};

export interface Theme {
  mode: ThemeMode;
  colors: typeof colors;
  gradients: typeof gradients;
  overlays: typeof overlays;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  iconSizes: typeof iconSizes;
  buttonSizes: typeof buttonSizes;
  inputSizes: typeof inputSizes;
  shadows: typeof shadows;
  t: SemanticTheme;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({
  mode = 'dark',
  children,
}: {
  mode?: ThemeMode;
  children: React.ReactNode;
}) {
  const value = useMemo<Theme>(
    () => ({
      mode,
      colors,
      gradients,
      overlays,
      typography,
      spacing,
      borderRadius,
      iconSizes,
      buttonSizes,
      inputSizes,
      shadows,
      t: mode === 'dark' ? darkTheme : lightTheme,
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
