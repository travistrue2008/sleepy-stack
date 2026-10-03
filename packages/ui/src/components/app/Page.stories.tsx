import Page from './Page'
import { expect } from 'storybook/test'
import { withRouter } from 'storybook-addon-remix-react-router'
import { ComponentRefs } from '../../../.storybook/mocks'

import type { Meta, StoryObj } from '@storybook/react-vite'

class PageRefs extends ComponentRefs {
  get heading () {
    return this.canvas.getByRole('heading', { name: 'Example' })
  }

  get description () {
    return this.canvas.getByText('A sleepy-stack starter template.')
  }

  get itemsLink () {
    return this.canvas.getByRole('link', { name: 'Items' })
  }
}

const meta = {
  title: 'App/Page',
  component: Page,
  decorators: [withRouter],
} satisfies Meta<typeof Page>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const refs = new PageRefs(canvasElement)

    await expect(refs.heading).toBeInTheDocument()
    await expect(refs.description).toBeInTheDocument()
    await expect(refs.itemsLink).toHaveAttribute('href', '/items')
  },
}
