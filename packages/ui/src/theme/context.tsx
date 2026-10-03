import React from 'react'
import { ThemeProvider as EmotionThemeProvider } from '@emotion/react'
import { Variant } from './types'
import { defaultTheme } from './theme'

import type { Theme } from './types'

const themes = {
  [Variant.Default]: defaultTheme,
} as const

const ThemeContext = React.createContext<Theme | null>(null)

export type ThemeProviderProps = {
  variant: Variant
  children: React.ReactNode
}

export function ThemeProvider ({
  variant,
  children,
}: ThemeProviderProps) {
  const theme = themes[variant]

  return (
    <ThemeContext.Provider value={theme}>
      <EmotionThemeProvider theme={theme}>
        {children}
      </EmotionThemeProvider>
    </ThemeContext.Provider>
  )
}

export function useTheme (): Theme {
  const theme = React.useContext(ThemeContext)

  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return theme
}
