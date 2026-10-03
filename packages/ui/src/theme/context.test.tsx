import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { ThemeProvider, useTheme, Variant } from '.'
import { defaultTheme } from './theme'

import type { ReactNode } from 'react'

function wrapper (variant: Variant) {
  return function Wrapper ({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider variant={variant}>
        {children}
      </ThemeProvider>
    )
  }
}

describe('useTheme', () => {
  it('returns the default theme inside a provider', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: wrapper(Variant.Default),
    })

    expect(result.current).toEqual(defaultTheme)
    expect(result.current.variant).toBe(Variant.Default)
  })

  it('throws when used outside a provider', () => {
    expect(() => {
      renderHook(() => useTheme())
    }).toThrow('useTheme must be used within a ThemeProvider')
  })
})
