# Stardomes 2FA Mobile App — Design Assets Definition

> **Version:** 2.0
> **Framework:** React Native (iOS + Android)
> **Design System:** Stardomes Secure Identity — An Emcredit Venture
> **Brand Source:** `00_Common_Layer/99_Assets/`

---

## 1. Color Palette

### 1.1 Brand Colors (from Brand Guidelines)

```
Color 1 — Stardomes Cyan     R=0   G=178 B=214   #00B2D6   CMYK(73, 7, 11, 0)
Color 2 — Deep Navy          R=30  G=31  B=87    #1E1F57   CMYK(100, 98, 34, 30)
Color 3 — Teal Green         R=0   G=176 B=167   #00B0A7   CMYK(76, 5, 42, 0)
Color 4 — Light Gray         R=230 G=230 B=230   #E6E6E6   CMYK(9, 6, 6, 0)
Color 5 — Medium Gray        R=204 G=204 B=204   #CCCCCC   CMYK(20, 15, 15, 0)
```

### 1.2 Color Tokens (Design System)

```typescript
const colors = {
  // Primary — Stardomes Cyan (brand accent, interactive elements, CTAs)
  // Used in logo subtitle, satellite icon, links, active states
  primary: {
    50:  '#E0F7FA',   // Lightest tint — notification badges bg
    100: '#B2EBF2',   // Light tint — selected row bg
    200: '#80DEEA',   // Soft — hover/focus ring
    300: '#4DD0E1',   // Medium — progress indicators
    400: '#26C6DA',   // Active — pressed buttons
    500: '#00B2D6',   // PRIMARY BASE — Stardomes Cyan
    600: '#00A0C1',   // Pressed variant
    700: '#008BA8',   // Dark variant
    800: '#00778F',   // Darker
    900: '#005A6B',   // Darkest — high contrast on white
  },

  // Secondary — Deep Navy (brand anchor, text on light, backgrounds)
  // Used in logo wordmark "STARDOMES", headings, dark backgrounds
  secondary: {
    50:  '#E8E8EE',   // Lightest tint
    100: '#C5C5D6',   // Light bg
    200: '#9E9FBB',   // Soft
    300: '#7778A0',   // Medium
    400: '#595B8C',   // Active
    500: '#1E1F57',   // SECONDARY BASE — Deep Navy
    600: '#1B1C4F',   // Pressed
    700: '#171844',   // Dark variant
    800: '#121339',   // Darker
    900: '#0A0B25',   // Darkest — near black
  },

  // Accent — Teal Green (secondary interactive, success-adjacent, verification)
  // Complementary to primary cyan, used for secondary actions, verified states
  accent: {
    50:  '#E0F5F3',   // Lightest
    100: '#B3E7E3',   // Light
    200: '#80D8D1',   // Soft
    300: '#4DC9BF',   // Medium
    400: '#26BDB2',   // Active
    500: '#00B0A7',   // ACCENT BASE — Teal Green
    600: '#009E96',   // Pressed
    700: '#008981',   // Dark
    800: '#00746D',   // Darker
    900: '#00524D',   // Darkest
  },

  // Neutral Grays (from brand guideline + extended)
  neutral: {
    0:   '#FFFFFF',   // Pure white — card backgrounds, primary bg
    50:  '#FAFAFA',   // Off-white — page background
    100: '#F5F5F5',   // Light gray — section background
    200: '#E6E6E6',   // BRAND LIGHT GRAY — dividers, borders
    300: '#CCCCCC',   // BRAND MEDIUM GRAY — disabled, borders
    400: '#B3B3B3',   // Placeholder text
    500: '#999999',   // Secondary text (light mode)
    600: '#757575',   // Body text secondary
    700: '#616161',   // Body text primary
    800: '#424242',   // Headings (light mode)
    900: '#212121',   // High emphasis text
    1000: '#000000',  // Pure black
  },
};
```

### 1.3 Semantic Colors (Status & Feedback)

```typescript
const semanticColors = {
  // Success — Green (Transaction Approved, Identity Verified, Device Trusted)
  success: {
    light:  '#81C784',
    main:   '#4CAF50',
    dark:   '#388E3C',
    contrast: '#FFFFFF',
  },

  // Warning — Amber (Pending Challenge, Expiring Soon, Attention Required)
  warning: {
    light:  '#FFB74D',
    main:   '#FF9800',
    dark:   '#F57C00',
    contrast: '#000000',
  },

  // Error — Red (Denied, Failed, Revoked, Expired)
  error: {
    light:  '#E57373',
    main:   '#F44336',
    dark:   '#D32F2F',
    contrast: '#FFFFFF',
  },

  // Info — Uses primary cyan (BLE scanning, informational)
  info: {
    light:  '#4DD0E1',
    main:   '#00B2D6',   // Reuses brand primary
    dark:   '#008BA8',
    contrast: '#FFFFFF',
  },
};
```

### 1.4 Gradients

```typescript
const gradients = {
  // Starfield hero — Deep navy to dark (Welcome, Splash, Challenge backgrounds)
  // Evokes the Stardomes space/satellite identity
  starfield: {
    colors: ['#0A0B25', '#1E1F57', '#2A2B6B'],
    start: { x: 0, y: 0 },
    end: { x: 0.5, y: 1 },
  },

  // Cyan glow — Primary CTA buttons, active states
  cyanGlow: {
    colors: ['#00B2D6', '#00A0C1', '#008BA8'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Navy-to-cyan — Header bars, card accents
  navyToCyan: {
    colors: ['#1E1F57', '#00B2D6'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },

  // Teal accent — Secondary buttons, verified badges
  tealAccent: {
    colors: ['#00B0A7', '#00B2D6'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },

  // Success glow — Approval confirmation screen
  successGlow: {
    colors: ['#66BB6A', '#4CAF50', '#388E3C'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },

  // Secure dark — Biometric prompts, encryption overlays
  secureDark: {
    colors: ['#0A0B25', '#1E1F57'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },

  // BLE connection pulse — Satellite terminal status
  bleActive: {
    colors: ['#00B2D6', '#00B0A7', '#00B2D6'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
};
```

### 1.5 Background Overlays

```typescript
const overlays = {
  scrim:      'rgba(30, 31, 87, 0.5)',     // Navy-tinted modal backdrop
  scrimDark:  'rgba(10, 11, 37, 0.7)',     // Dark navy scrim (challenge screen)
  scrimLight: 'rgba(30, 31, 87, 0.3)',     // Light navy scrim

  glassDark:  'rgba(30, 31, 87, 0.85)',    // Frosted navy glass
  glassLight: 'rgba(255, 255, 255, 0.85)', // Frosted white glass

  statusBarLight: 'rgba(255, 255, 255, 0.95)',
  statusBarDark:  'rgba(30, 31, 87, 0.95)',
};
```

### 1.6 Dark Mode (Default for Secure Screens)

The Stardomes brand leans dark (space/satellite theme). The app uses a **dark-first** approach
for secure screens (challenge, biometric, OTP) and light mode for utility screens (history, settings).

```typescript
const darkTheme = {
  background:     '#0A0B25',   // Near-black navy
  surface:        '#1E1F57',   // Deep navy — card surfaces
  surfaceLight:   '#2A2B6B',   // Lighter navy — elevated cards
  textPrimary:    '#FFFFFF',
  textSecondary:  '#B2EBF2',   // Cyan-tinted light text
  textMuted:      '#9E9FBB',   // Muted navy-gray
  border:         '#3A3B7B',   // Subtle navy border
  divider:        '#2A2B6B',
};

const lightTheme = {
  background:     '#FAFAFA',
  surface:        '#FFFFFF',
  surfaceLight:   '#F5F5F5',
  textPrimary:    '#1E1F57',   // Navy headings on white
  textSecondary:  '#616161',
  textMuted:      '#999999',
  border:         '#E6E6E6',   // Brand light gray
  divider:        '#E6E6E6',
};
```

---

## 2. Typography

### 2.1 Font Families

The Stardomes brand uses **Decimal** as the primary typeface (display and body)
and **Tahoma Bold** as the system/fallback font.

```typescript
const fontFamilies = {
  // Display: Decimal Bold — Headlines, hero text, wordmark
  // Matches the "STARDOMES" logo typography
  display: {
    bold: 'Decimal-Bold',         // decimal-bold-2.otf
  },

  // Primary: Decimal Book — Body text, labels, form fields
  primary: {
    regular: 'Decimal-Book',      // decimal-book-2.ttf
    light: 'Decimal-ExtraLight',  // decimal-extralight.ttf
    bold: 'Decimal-Bold',         // decimal-bold-2.otf
  },

  // Secondary/Fallback: Tahoma Bold — System fallback, button labels
  secondary: {
    bold: 'Tahoma-Bold',          // tahomabd.ttf
  },

  // Monospace: System monospace for OTP, IDs (no custom mono font in brand kit)
  // Use platform default: Menlo (iOS) / Roboto Mono (Android)
  mono: {
    regular: Platform.OS === 'ios' ? 'Menlo' : 'RobotoMono-Regular',
    bold: Platform.OS === 'ios' ? 'Menlo-Bold' : 'RobotoMono-Bold',
  },
};
```

**Font Files (from `00_Common_Layer/99_Assets/Fonts/`):**

| File | Weight | Role | Source Path |
|------|--------|------|-------------|
| `decimal-bold-2.otf` | Bold (700) | Display headings, hero text, buttons | `99_Assets/Fonts/decimal-bold-2.otf` |
| `decimal-book-2.ttf` | Book/Regular (400) | Body text, labels, form fields | `99_Assets/Fonts/decimal-book-2.ttf` |
| `decimal-extralight.ttf` | ExtraLight (200) | Large display numbers, subtle captions | `99_Assets/Fonts/decimal-extralight.ttf` |
| `tahomabd.ttf` | Bold (700) | Fallback, system buttons | `99_Assets/Fonts/tahomabd.ttf` |

### 2.2 Type Scale

```typescript
const typography = {
  // Hero display — Welcome screen title, splash text
  hero: {
    fontSize: 40,
    lineHeight: 48,
    fontFamily: 'Decimal-Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',   // Matches "STARDOMES" brand style
  },

  // H1 — Screen titles
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontFamily: 'Decimal-Bold',
    letterSpacing: 1,
  },

  // H2 — Section headers
  h2: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: 'Decimal-Bold',
    letterSpacing: 0.5,
  },

  // H3 — Card titles, subsection headers
  h3: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: 'Decimal-Bold',
    letterSpacing: 0,
  },

  // H4 — Labels, small headers
  h4: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Decimal-Bold',
    letterSpacing: 0,
  },

  // Body Large — Challenge details, transaction info
  bodyLarge: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: 'Decimal-Book',
    letterSpacing: 0.15,
  },

  // Body — Default body text
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Decimal-Book',
    letterSpacing: 0.5,
  },

  // Body Small — Secondary text, list items
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Decimal-Book',
    letterSpacing: 0.25,
  },

  // Caption — Timestamps, hints, metadata
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Decimal-Book',
    letterSpacing: 0.4,
  },

  // Extra Light Display — Large numbers, financial amounts, OTP digits
  displayLight: {
    fontSize: 64,
    lineHeight: 72,
    fontFamily: 'Decimal-ExtraLight',
    letterSpacing: 4,
  },

  // Overline — Status labels, tags, section overlines
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Decimal-Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Button text
  button: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Decimal-Bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // OTP Display — Large monospace for OTP codes
  otpDisplay: {
    fontSize: 56,
    lineHeight: 64,
    fontFamily: Platform.OS === 'ios' ? 'Menlo-Bold' : 'RobotoMono-Bold',
    letterSpacing: 12,
  },

  // Transaction Amount — Large financial figures
  amountLarge: {
    fontSize: 48,
    lineHeight: 56,
    fontFamily: 'Decimal-ExtraLight',
    letterSpacing: 0,
  },

  // Device ID / Transaction ID — Monospaced identifiers
  monospace: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'RobotoMono-Regular',
    letterSpacing: 0,
  },

  // Subtitle — "AN EMCREDIT VENTURE" style, small uppercase tracking
  subtitle: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Decimal-Book',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
};
```

---

## 3. Brand Images & Logos

### 3.1 Existing Brand Assets (from `00_Common_Layer/99_Assets/`)

#### Logo Variants (SVG — 3 artboards at 1920x1080)

| File | Wordmark Color | Subtitle Color | Usage |
|------|---------------|----------------|-------|
| [Artboard 1.svg](../../00_Common_Layer/99_Assets/images/Artboard%201.svg) | Deep Navy `#1E1F57` | Cyan `#00B2D6` | **Light backgrounds** — settings, profile, forms |
| [Artboard 2.svg](../../00_Common_Layer/99_Assets/images/Artboard%202.svg) | White `#FFFFFF` | Cyan `#00B2D6` | **Dark backgrounds** — welcome, splash, challenge |
| [Artboard 3.svg](../../00_Common_Layer/99_Assets/images/Artboard%203.svg) | White `#FFFFFF` | White `#FFFFFF` | **Image overlays** — on top of photos/starfield |

Logo anatomy:
- "STARDOMES" — serif display wordmark with satellite icon in the "O"
  (circle + signal dots + connecting lines = satellite connectivity)
- "AN EMCREDIT VENTURE" — small uppercase subtitle below

#### Other Brand Images

| File | Usage |
|------|-------|
| [stardomes_logo.svg](../../00_Common_Layer/99_Assets/images/stardomes_logo.svg) | Standalone logo (same as Artboard 1) |
| [stardomes_logo.jpg](../../00_Common_Layer/99_Assets/images/stardomes_logo.jpg) | Raster fallback |
| [stardomes_title_v1.png](../../00_Common_Layer/99_Assets/images/stardomes_title_v1.png) | Title banner — dark starfield with logo (top bar/header) |
| [STARDOMES EMAIL SIGNATURE copy.png](../../00_Common_Layer/99_Assets/images/STARDOMES%20EMAIL%20SIGNATURE%20copy.png) | Email signature banner |
| [Logo-Cropped.png](../../00_Common_Layer/99_Assets/images/Logo-Cropped.png) | Cropped logo mark (for app icon base) |
| [3ds_stardomes_secure_bolton.png](../../00_Common_Layer/99_Assets/images/3ds_stardomes_secure_bolton.png) | 3DS Secure OTP flow diagram (dark navy bg + cyan accents) |

#### Stock Photography (Space/Satellite Theme)

| File | Description | Mobile Use |
|------|-------------|------------|
| `shutterstock_557310703.jpg` | Space/satellite imagery | Welcome screen hero bg |
| `shutterstock_2212948463.jpg` | Space theme | Onboarding background |
| `shutterstock_2280913589.jpg` | Space theme | Alternative bg |
| `shutterstock_1487210270.jpg` | Space theme | Settings header |
| `shutterstock_658758577.jpg` | Space theme | Splash variation |
| `shutterstock_2086166971.jpg` | Space theme | Challenge bg |
| `shutterstock_1421446100.jpg` | Space theme | Empty state bg |
| `shutterstock_1022824408.jpg` | Space theme | Profile header |
| `shutterstock_1923660803.jpg` | Space theme | About screen |
| `beautiful-view-stars-night-sky.jpg` | Night sky | Dark mode hero |
| `wp2601893-space-wallpaper.jpg` | Space wallpaper | Splash candidate |
| `wp3837767-space-4k-wallpapers.jpg` | 4K space | High-res hero |
| `wp6730937-space-laptop-wallpapers.jpg` | Space | Landscape header |
| `wp14625201-4k-satellite-wallpapers.jpg` | 4K satellite | Satellite feature bg |
| `sat-image-cropped.webp` | Satellite image | BLE/terminal screen |
| `Asset 1-100.jpg` | Brand asset | General use |
| `Artboard 1@4x-100.jpg` | High-res artboard | Print/marketing |

### 3.2 App-Specific Images to Create

**Background images** — Crop/process from stock above for mobile:

| Image | Source | Dimensions | Usage |
|-------|--------|------------|-------|
| `welcome-hero.png` | `wp3837767-space-4k-wallpapers.jpg` | 1170x2532 @3x | Welcome screen fullbleed |
| `splash-bg.png` | `beautiful-view-stars-night-sky.jpg` | 1170x2532 @3x | Splash screen |
| `challenge-bg.png` | `shutterstock_2086166971.jpg` | 1170x2532 @3x | Challenge modal backdrop |
| `satellite-hero.png` | `wp14625201-4k-satellite-wallpapers.jpg` | 1170x600 @3x | BLE/satellite feature |
| `onboarding-bg.png` | `shutterstock_2212948463.jpg` | 1170x2532 @3x | Onboarding flow |
| `header-stars.png` | `stardomes_title_v1.png` (crop) | 1170x200 @3x | Compact nav header |

**Onboarding Illustrations** — Create in brand colors (navy + cyan + teal on dark bg):

| Image | Size | Style | Usage |
|-------|------|-------|-------|
| `onboarding-01-identity.svg` | 300x300 | Outline icon: person + shield | Identity registration |
| `onboarding-02-device.svg` | 300x300 | Outline icon: phone + key | Device binding |
| `onboarding-03-biometric.svg` | 300x300 | Outline icon: fingerprint + checkmark | Biometric setup |
| `onboarding-04-ready.svg` | 300x300 | Outline icon: satellite dish + signal | Setup complete, satellite ready |

**Illustration style:** Line-art/outline, 2px stroke, `#00B2D6` primary stroke,
`#00B0A7` accent fills, on transparent or `#1E1F57` dark background.

**Empty States** — Minimal illustrations:

| Image | Size | Usage |
|-------|------|-------|
| `empty-history.svg` | 200x200 | No transactions yet |
| `empty-banks.svg` | 200x200 | No linked banks |
| `empty-challenges.svg` | 200x200 | No pending challenges |
| `ble-not-found.svg` | 200x200 | No BLE terminal found |

**Status Illustrations** — Animated Lottie or static SVG:

| Image | Size | Usage |
|-------|------|-------|
| `success-checkmark.svg` | 200x200 | Approved — cyan checkmark with glow |
| `error-cross.svg` | 200x200 | Denied — red cross |
| `warning-alert.svg` | 200x200 | Expiring — amber triangle |
| `pending-clock.svg` | 200x200 | Processing — spinning cyan |

---

## 4. Icons

### 4.1 System Icons (Ionicons)

Use **Ionicons** as the primary icon library. All system icons render in brand colors:
- Default: `neutral[600]` on light / `neutral[300]` on dark
- Active: `primary[500]` (`#00B2D6`)
- Tab bar: `secondary[500]` (`#1E1F57`) inactive, `primary[500]` active

```typescript
const iconNames = {
  // Navigation
  home: 'home-outline',
  history: 'time-outline',
  settings: 'settings-outline',
  profile: 'person-outline',
  back: 'chevron-back-outline',
  close: 'close-outline',

  // Authentication & Security
  biometric: 'finger-print-outline',
  shield: 'shield-checkmark-outline',
  lock: 'lock-closed-outline',
  unlock: 'lock-open-outline',
  key: 'key-outline',
  scan: 'scan-outline',

  // Transaction & Challenge
  checkmark: 'checkmark-circle-outline',
  close_circle: 'close-circle-outline',
  alert: 'alert-circle-outline',
  time: 'time-outline',
  send: 'send-outline',
  wallet: 'wallet-outline',

  // BLE & Connectivity
  bluetooth: 'bluetooth-outline',
  bluetooth_connected: 'bluetooth',
  wifi: 'wifi-outline',
  satellite: 'radio-outline',
  sync: 'sync-outline',

  // Device & Notifications
  phone: 'phone-portrait-outline',
  notifications: 'notifications-outline',
  notifications_off: 'notifications-off-outline',

  // Data & Info
  info: 'information-circle-outline',
  help: 'help-circle-outline',
  document: 'document-text-outline',
  calendar: 'calendar-outline',
  copy: 'copy-outline',

  // Actions
  edit: 'create-outline',
  delete: 'trash-outline',
  add: 'add-circle-outline',
  refresh: 'refresh-outline',
  search: 'search-outline',

  // Status (filled variants)
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'warning',
  pending: 'ellipsis-horizontal-circle',

  // Regional
  flag: 'flag-outline',
  globe: 'globe-outline',
};
```

### 4.2 Custom Brand Icons

SVG icons extracted from the logo or created in brand style:

| Icon | Source | Colors | Usage |
|------|--------|--------|-------|
| `stardomes-satellite-icon.svg` | Extracted from logo "O" | `#00B2D6` | App icon center, satellite indicator |
| `stardomes-wordmark-dark.svg` | From Artboard 1 (text only) | `#1E1F57` | Light bg headers |
| `stardomes-wordmark-light.svg` | From Artboard 2 (text only) | `#FFFFFF` | Dark bg headers |
| `emcredit-badge.svg` | "AN EMCREDIT VENTURE" | `#00B2D6` | Footer badge, about screen |
| `uae-pass-logo.svg` | UAE Pass brand kit | Official | KYC integration |
| `fido2-key.svg` | Custom line art | `#00B2D6` stroke | Device binding |
| `terminal-device.svg` | Custom (ESP32/LoRa) | `#00B0A7` stroke | BLE terminal |

### 4.3 Bank Logos

**File path:** `assets/icons/banks/`

| File | Size | Notes |
|------|------|-------|
| `bank-default.png` | 512x512 @3x | Generic bank — navy rounded square |
| `emirates-nbd.png` | 512x512 @3x | Replace with official |
| `adib.png` | 512x512 @3x | Replace with official |
| `fab.png` | 512x512 @3x | Replace with official |
| `adcb.png` | 512x512 @3x | Replace with official |
| `mashreq.png` | 512x512 @3x | Replace with official |

---

## 5. Spacing & Layout System

### 5.1 Spacing Scale (8px Grid)

```typescript
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};
```

### 5.2 Border Radius

```typescript
const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
};
```

### 5.3 Shadows & Elevation

```typescript
const shadows = {
  sm: {
    shadowColor: '#1E1F57',    // Navy shadow tint
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1E1F57',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1E1F57',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  // Cyan glow for active/focused elements
  glow: {
    shadowColor: '#00B2D6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};
```

---

## 6. Component Sizes

### 6.1 Button Sizes

```typescript
const buttonSizes = {
  small:  { height: 36, paddingHorizontal: 16, fontSize: 14 },
  medium: { height: 48, paddingHorizontal: 24, fontSize: 16 },
  large:  { height: 56, paddingHorizontal: 32, fontSize: 18 },
};
```

### 6.2 Input Sizes

```typescript
const inputSizes = {
  height: 56,
  paddingHorizontal: 16,
  fontSize: 16,
  borderWidth: 1,
  borderRadius: 8,
  // Border colors: neutral[300] default, primary[500] focused, error.main on error
};
```

### 6.3 Icon Sizes

```typescript
const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
};
```

---

## 7. Animation & Motion

```typescript
const duration = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  verySlow: 800,
};

const easing = {
  easeIn: Easing.ease,
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),
  spring: Easing.elastic(1.2),
};

const haptics = {
  light: 'light',
  medium: 'medium',
  heavy: 'heavy',
  success: 'notificationSuccess',
  warning: 'notificationWarning',
  error: 'notificationError',
};
```

---

## 8. Platform-Specific Guidelines

### 8.1 iOS

- Bottom tab bar: 83px (with safe area)
- Nav bar: 44px
- `SafeAreaView` on all screens
- Swipe-to-go-back gestures
- iOS action sheets for destructive actions

### 8.2 Android

- Material Design 3 elevation
- Top app bar: 56px, Bottom nav: 56px
- Ripple effects on touchables
- Hardware back button support throughout

---

## 9. App Icon & Splash Screen

### 9.1 App Icon

Design: Extract satellite icon from the "O" in STARDOMES logo.
- Shape: Rounded square
- Background: Deep Navy `#1E1F57`
- Icon: Satellite symbol in Cyan `#00B2D6`
- Source: Extract from `stardomes_logo.svg` or `Logo-Cropped.png`

**iOS:**
- 1024x1024 (App Store), 180x180 (3x), 120x120 (2x), 167x167 (iPad Pro), 152x152 (iPad)

**Android:**
- 512x512 (Play Store), 192/144/96/72/48 (xxxhdpi → mdpi)
- Adaptive icon: Foreground = satellite icon, Background = `#1E1F57`

### 9.2 Splash Screen

- Background: Deep Navy `#1E1F57` solid, or `gradients.starfield`
- Center: White Stardomes logo (Artboard 3 variant)
- Size: Logo 40% of screen width, vertically centered
- Subtitle: "AN EMCREDIT VENTURE" in `#00B2D6`, 16px below logo

---

## 10. Accessibility

### 10.1 Color Contrast (WCAG AA)

| Combination | Ratio | Pass? |
|-------------|-------|-------|
| Navy `#1E1F57` on white `#FFFFFF` | 13.2:1 | AA (all sizes) |
| Cyan `#00B2D6` on navy `#1E1F57` | 5.3:1 | AA (all sizes) |
| White `#FFFFFF` on navy `#1E1F57` | 13.2:1 | AA (all sizes) |
| Cyan `#00B2D6` on white `#FFFFFF` | 2.9:1 | AA Large text only |
| Teal `#00B0A7` on white `#FFFFFF` | 3.0:1 | AA Large text only |
| Teal `#00B0A7` on navy `#1E1F57` | 4.3:1 | AA Large text |
| `neutral[700]` on white | 5.7:1 | AA (all sizes) |

**Rules:**
- Never use cyan `#00B2D6` for small body text on white (contrast too low)
- Use navy `#1E1F57` for primary text on light backgrounds
- Use white for primary text on dark backgrounds
- Cyan is safe for: large headings on white, all text on navy, interactive elements

### 10.2 Touch Targets

Minimum: **44x44pt** (iOS) / **48x48dp** (Android)

### 10.3 Icon Labels

```typescript
<Icon name="shield-checkmark-outline" accessibilityLabel="Verified" />
```

---

## 11. File Structure Summary

```
03_MobileApp/
├── assets/
│   ├── fonts/                                      # Copy from 99_Assets/Fonts/
│   │   ├── decimal-bold-2.otf                      # Display, headings, buttons
│   │   ├── decimal-book-2.ttf                      # Body text, labels
│   │   ├── decimal-extralight.ttf                  # Large numbers, amounts
│   │   └── tahomabd.ttf                            # Fallback bold
│   ├── icons/
│   │   ├── brand/
│   │   │   ├── stardomes-satellite-icon.svg        # Extracted from logo "O"
│   │   │   ├── stardomes-wordmark-dark.svg         # Navy on transparent
│   │   │   ├── stardomes-wordmark-light.svg        # White on transparent
│   │   │   └── emcredit-badge.svg                  # "AN EMCREDIT VENTURE"
│   │   ├── custom/
│   │   │   ├── uae-pass-logo.svg
│   │   │   ├── fido2-key.svg
│   │   │   ├── terminal-device.svg
│   │   │   ├── biometric-face.svg
│   │   │   └── biometric-fingerprint.svg
│   │   └── banks/
│   │       ├── bank-default.png (@1x, @2x, @3x)
│   │       ├── emirates-nbd.png
│   │       ├── adib.png
│   │       ├── fab.png
│   │       ├── adcb.png
│   │       └── mashreq.png
│   ├── images/
│   │   ├── backgrounds/                            # Processed from 99_Assets/images/
│   │   │   ├── welcome-hero.png (@1x, @2x, @3x)
│   │   │   ├── splash-bg.png
│   │   │   ├── challenge-bg.png
│   │   │   ├── satellite-hero.png
│   │   │   ├── onboarding-bg.png
│   │   │   └── header-stars.png
│   │   ├── onboarding/
│   │   │   ├── onboarding-01-identity.svg
│   │   │   ├── onboarding-02-device.svg
│   │   │   ├── onboarding-03-biometric.svg
│   │   │   └── onboarding-04-ready.svg
│   │   ├── empty/
│   │   │   ├── empty-history.svg
│   │   │   ├── empty-banks.svg
│   │   │   ├── empty-challenges.svg
│   │   │   └── ble-not-found.svg
│   │   └── status/
│   │       ├── success-checkmark.svg
│   │       ├── error-cross.svg
│   │       ├── warning-alert.svg
│   │       └── pending-clock.svg
│   └── splash/
│       ├── splash-icon.png                         # From Logo-Cropped.png
│       └── splash-background.png                   # Navy solid or starfield
└── src/
    └── theme/
        ├── colors.ts                               # Brand palette + semantic
        ├── typography.ts                            # Decimal type scale
        ├── spacing.ts                               # 8px grid system
        ├── shadows.ts                               # Navy-tinted elevations
        ├── darkTheme.ts                             # Dark mode (default secure)
        ├── lightTheme.ts                            # Light mode (utility)
        └── index.ts                                 # Unified theme export
```

---

## 12. Implementation: React Native Font Linking

```javascript
// react-native.config.js
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts/'],
};
```

Then run:
```bash
npx react-native-asset
```

This registers `decimal-bold-2`, `decimal-book-2`, `decimal-extralight`, and `tahomabd`
as available font families on both iOS and Android.

---

## 13. Implementation: Theme Provider

```typescript
// src/theme/colors.ts
export const colors = {
  primary:   { 500: '#00B2D6', /* ...full scale */ },
  secondary: { 500: '#1E1F57', /* ...full scale */ },
  accent:    { 500: '#00B0A7', /* ...full scale */ },
  neutral:   { 200: '#E6E6E6', 300: '#CCCCCC', /* ...full scale */ },
  success:   { main: '#4CAF50' },
  warning:   { main: '#FF9800' },
  error:     { main: '#F44336' },
};

// src/theme/index.ts
import { colors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius } from './spacing';
import { shadows } from './shadows';
import { darkTheme, lightTheme } from './themes';

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  dark: darkTheme,
  light: lightTheme,
};

// Usage in components
import { useTheme } from '../context/ThemeContext';

function ChallengeCard({ bankName, amount }) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={{
      backgroundColor: colors.secondary[500],  // Deep Navy
      padding: spacing.lg,
      borderRadius: 16,
      ...shadows.glow,  // Cyan glow
    }}>
      <Text style={{
        ...typography.overline,
        color: colors.primary[500],  // Cyan label
      }}>
        TRANSACTION APPROVAL
      </Text>
      <Text style={{
        ...typography.h2,
        color: '#FFFFFF',
      }}>
        {bankName}
      </Text>
      <Text style={{
        ...typography.amountLarge,
        color: '#FFFFFF',
      }}>
        AED {amount}
      </Text>
    </View>
  );
}
```

---

## 14. Design Mockup References

Screen designs should follow the **dark-first for security, light for utility** principle:

| Screen | Theme | Key Brand Elements |
|--------|-------|--------------------|
| Splash | Dark (starfield gradient) | White logo (Artboard 3), cyan subtitle |
| Welcome | Dark (space stock photo bg) | White logo, cyan CTA buttons |
| Registration | Light | Navy headings, cyan input focus, teal verified badges |
| KYC/UAE Pass | Light | UAE Pass logo, navy text, cyan progress |
| Biometric Setup | Dark (secure overlay) | Cyan fingerprint icon, navy surface |
| Challenge Screen | Dark (starfield) | White text, cyan amount, teal approve button |
| OTP Display | Dark | Extra-light 56px OTP, cyan countdown ring |
| Transaction History | Light | Navy text, status badges (green/red/amber) |
| Profile & Settings | Light | Navy headings, cyan links, gray sections |
| BLE Terminal Status | Dark | Satellite image bg, cyan pulse animation, teal connected |

---

**Next Steps:**
1. Copy fonts from `00_Common_Layer/99_Assets/Fonts/` to `03_MobileApp/assets/fonts/`
2. Extract satellite icon from logo SVG for app icon
3. Process stock photos into mobile-optimized backgrounds (@1x, @2x, @3x)
4. Create onboarding/empty-state illustrations in brand style (line art, cyan/teal on navy)
5. Implement `src/theme/` with Decimal font family and brand color tokens
6. Set up `react-native.config.js` for font linking
