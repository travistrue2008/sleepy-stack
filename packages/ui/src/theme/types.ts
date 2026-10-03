export const Variant = {
  Default: 'default',
} as const

export type Variant = typeof Variant[keyof typeof Variant]

export type Colors = {
  background: string
  surface: string
  surfaceHover: string
  border: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  accent: string
  accentDim: string
  correct: string
  wrong: string
  backdrop: string
  interactive: string
  interactiveText: string
}

export type Fonts = {
  body: string
}

export type FontSizes = {
  xs: string
  sm: string
  md: string
  lg: string
  xl: string
  '2xl': string
  '3xl': string
  '4xl': string
  '5xl': string
  '6xl': string
  '9xl': string
  '12xl': string
}

export type Spacing = {
  '0.25': string
  '0.5': string
  '0.75': string
  '1': string
  '1.5': string
  '2': string
  '3': string
  '4': string
  '8': string
}

export type Radius = {
  sm: string
  md: string
  full: string
}

export type Theme = {
  variant: Variant
  color: Colors
  font: Fonts
  fontSize: FontSizes
  spacing: Spacing
  radius: Radius
}
