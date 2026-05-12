// Stardomes Brand Color System
// Source: 00_Common_Layer/99_Assets/ brand guidelines + ASSETS.md

export const colors = {
  // Primary — Stardomes Cyan (interactive elements, CTAs, links, active states)
  primary: {
    50:  '#E0F7FA',
    100: '#B2EBF2',
    200: '#80DEEA',
    300: '#4DD0E1',
    400: '#26C6DA',
    500: '#00B2D6',  // BASE — Stardomes Cyan
    600: '#00A0C1',
    700: '#008BA8',
    800: '#00778F',
    900: '#005A6B',
  },

  // Secondary — Deep Navy (headings, dark backgrounds, wordmark)
  secondary: {
    50:  '#E8E8EE',
    100: '#C5C5D6',
    200: '#9E9FBB',
    300: '#7778A0',
    400: '#595B8C',
    500: '#1E1F57',  // BASE — Deep Navy
    600: '#1B1C4F',
    700: '#171844',
    800: '#121339',
    900: '#0A0B25',
  },

  // Accent — Teal Green (verified states, secondary actions)
  accent: {
    50:  '#E0F5F3',
    100: '#B3E7E3',
    200: '#80D8D1',
    300: '#4DC9BF',
    400: '#26BDB2',
    500: '#00B0A7',  // BASE — Teal Green
    600: '#009E96',
    700: '#008981',
    800: '#00746D',
    900: '#00524D',
  },

  // Neutral Grays (brand Light Gray #E6E6E6 = 200, Medium Gray #CCCCCC = 300)
  neutral: {
    0:    '#FFFFFF',
    50:   '#FAFAFA',
    100:  '#F5F5F5',
    200:  '#E6E6E6',  // Brand Light Gray
    300:  '#CCCCCC',  // Brand Medium Gray
    400:  '#B3B3B3',
    500:  '#999999',
    600:  '#757575',
    700:  '#616161',
    800:  '#424242',
    900:  '#212121',
    1000: '#000000',
  },

  // Semantic
  success: { light: '#81C784', main: '#4CAF50', dark: '#388E3C', contrast: '#FFFFFF' },
  warning: { light: '#FFB74D', main: '#FF9800', dark: '#F57C00', contrast: '#000000' },
  error:   { light: '#E57373', main: '#F44336', dark: '#D32F2F', contrast: '#FFFFFF' },
  info:    { light: '#4DD0E1', main: '#00B2D6', dark: '#008BA8', contrast: '#FFFFFF' },
} as const;

export const gradients = {
  starfield:   { colors: ['#0A0B25', '#1E1F57', '#2A2B6B'] as const, start: { x: 0, y: 0 }, end: { x: 0.5, y: 1 } },
  cyanGlow:    { colors: ['#00B2D6', '#00A0C1', '#008BA8'] as const, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  navyToCyan:  { colors: ['#1E1F57', '#00B2D6'] as const, start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  tealAccent:  { colors: ['#00B0A7', '#00B2D6'] as const, start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  successGlow: { colors: ['#66BB6A', '#4CAF50', '#388E3C'] as const, start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  secureDark:  { colors: ['#0A0B25', '#1E1F57'] as const, start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  bleActive:   { colors: ['#00B2D6', '#00B0A7', '#00B2D6'] as const, start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
} as const;

export const overlays = {
  scrim:      'rgba(30, 31, 87, 0.5)',
  scrimDark:  'rgba(10, 11, 37, 0.7)',
  scrimLight: 'rgba(30, 31, 87, 0.3)',
  glassDark:  'rgba(30, 31, 87, 0.85)',
  glassLight: 'rgba(255, 255, 255, 0.85)',
} as const;
