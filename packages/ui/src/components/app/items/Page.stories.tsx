import Page from './Page'
import { expect } from 'storybook/test'
import { withRouter } from 'storybook-addon-remix-react-router'
import { ComponentRefs } from '../../../../.storybook/mocks'

import type { Meta, StoryObj } from '@storybook/react-vite'

class PageRefs extends ComponentRefs {
  get heading () {
    return this.canvas.findByRole('heading', { name: 'Items' })
  }

  get backLink () {
    return this.canvas.findByRole('link', { name: 'Back' })
  }

  get nameInput () {
    return this.canvas.findByPlaceholderText('Name')
  }

  get descriptionInput () {
    return this.canvas.findByPlaceholderText('Description')
  }

  get submitButton () {
    return this.canvas.findByRole('button', { name: 'Add' })
  }

  get emptyMessage () {
    return this.canvas.findByText(
      'No items yet. Add one above.',
    )
  }
}

const meta = {
  title: 'App/Items/Page',
  component: Page,
  decorators: [withRouter],
} satisfies Meta<typeof Page>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const refs = new PageRefs(canvasElement)

    await expect(await refs.heading).toBeInTheDocument()

    await expect(await refs.backLink).toHaveAttribute(
      'href',
      '/',
    )

    await expect(
      await refs.nameInput,
    ).toBeInTheDocument()

    await expect(
      await refs.descriptionInput,
    ).toBeInTheDocument()

    await expect(
      await refs.submitButton,
    ).toBeInTheDocument()

    await expect(
      await refs.emptyMessage,
    ).toBeInTheDocument()
  },
}
