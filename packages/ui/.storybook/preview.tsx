import 'modern-normalize/modern-normalize.css'
import { sb } from 'storybook/test'
import { ThemeProvider, Variant } from '../src/theme'

sb.mock(import('react-router'), { spy: true })

import type { Preview } from '@storybook/react-vite'

const preview: Preview = {
  decorators: [
    (Story) => {
      return (
        <ThemeProvider variant={Variant.Default}>
          <Story />
        </ThemeProvider>
      )
    },
  ],
}

export default preview
