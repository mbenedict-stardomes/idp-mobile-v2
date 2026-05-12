import { Platform } from 'react-native';

// System font fallbacks until Decimal fonts are linked via native build
const mono = Platform.select({ ios: 'Menlo', default: 'monospace' })!;
const monoBold = Platform.select({ ios: 'Menlo-Bold', default: 'monospace' })!;

export const typography = {
  hero:        { fontSize: 40, lineHeight: 48, fontWeight: '700' as const, letterSpacing: 2 },
  h1:          { fontSize: 32, lineHeight: 40, fontWeight: '700' as const, letterSpacing: 1 },
  h2:          { fontSize: 24, lineHeight: 32, fontWeight: '700' as const, letterSpacing: 0.5 },
  h3:          { fontSize: 20, lineHeight: 28, fontWeight: '700' as const, letterSpacing: 0 },
  h4:          { fontSize: 16, lineHeight: 24, fontWeight: '700' as const, letterSpacing: 0 },
  bodyLarge:   { fontSize: 18, lineHeight: 28, fontWeight: '400' as const, letterSpacing: 0.15 },
  body:        { fontSize: 16, lineHeight: 24, fontWeight: '400' as const, letterSpacing: 0.5 },
  bodySmall:   { fontSize: 14, lineHeight: 20, fontWeight: '400' as const, letterSpacing: 0.25 },
  caption:     { fontSize: 12, lineHeight: 16, fontWeight: '400' as const, letterSpacing: 0.4 },
  overline:    { fontSize: 12, lineHeight: 16, fontWeight: '700' as const, letterSpacing: 2, textTransform: 'uppercase' as const },
  button:      { fontSize: 16, lineHeight: 24, fontWeight: '700' as const, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  otpDisplay:  { fontSize: 56, lineHeight: 64, fontFamily: monoBold, letterSpacing: 12 },
  amountLarge: { fontSize: 48, lineHeight: 56, fontWeight: '200' as const, letterSpacing: 0 },
  monospace:   { fontSize: 13, lineHeight: 18, fontFamily: mono, letterSpacing: 0 },
  subtitle:    { fontSize: 11, lineHeight: 16, fontWeight: '400' as const, letterSpacing: 3, textTransform: 'uppercase' as const },
} as const;
