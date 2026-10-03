import { Variant } from './types'
import { colors, fonts, fontSizes, spacing, radius } from './global'

import type { Theme } from './types'

export const defaultTheme: Theme = {
  variant: Variant.Default,
  color: colors,
  font: fonts,
  fontSize: fontSizes,
  spacing,
  radius,
} as const
