import type { Colors, Fonts, FontSizes, Spacing, Radius } from './types'

export const colors: Colors = {
  background: '#141224',
  surface: '#1e1a3a',
  surfaceHover: '#2a2550',
  border: '#2a2550',
  textPrimary: '#ffffff',
  textSecondary: '#8a85a0',
  textMuted: '#c4c0d4',
  accent: '#FFC453',
  accentDim: '#3a2f00',
  correct: '#47D353',
  wrong: '#FF5353',
  backdrop: 'rgba(0, 0, 0, 0.6)',
  interactive: '#ffffff',
  interactiveText: '#141224',
} as const

export const fonts: Fonts = {
  body: 'system-ui, -apple-system, sans-serif',
} as const

export const fontSizes: FontSizes = {
  xs: '0.75rem',
  sm: '0.875rem',
  md: '1rem',
  lg: '1.25rem',
  xl: '1.5rem',
  '2xl': '2rem',
  '3xl': '3rem',
  '4xl': '4rem',
  '5xl': '5rem',
  '6xl': '6rem',
  '9xl': '9rem',
  '12xl': '12rem',
} as const

export const spacing: Spacing = {
  '0.25': '0.25rem',
  '0.5': '0.5rem',
  '0.75': '0.75rem',
  '1': '1rem',
  '1.5': '1.5rem',
  '2': '2rem',
  '3': '3rem',
  '4': '4rem',
  '8': '8rem',
} as const

export const radius: Radius = {
  sm: '0.5rem',
  md: '1rem',
  full: '50%',
} as const
