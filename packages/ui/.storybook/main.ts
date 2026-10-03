import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  addons: [
    '@storybook/addon-vitest',
    'storybook-addon-remix-react-router',
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
}

export default config
