import Button, { Mode } from './Button'
import { expect, fn, userEvent } from 'storybook/test'
import { withRouter } from 'storybook-addon-remix-react-router'
import { ComponentRefs } from '../../../.storybook/mocks'

import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ButtonProps } from './Button'

class ButtonRefs extends ComponentRefs {
  get button () {
    return this.canvas.getByRole('button', { name: 'Submit' })
  }

  get link () {
    return this.canvas.getByRole('link', { name: 'Go to Items' })
  }
}

const meta = {
  title: 'Controls/Button',
  component: Button,
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const AsButton: Story = {
  args: {
    mode: Mode.Button,
    children: 'Submit',
    onClick: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const props = args as Extract<ButtonProps, { mode: Mode.Button }>
    const refs = new ButtonRefs(canvasElement)

    await expect(refs.button).toBeInTheDocument()
    await userEvent.click(refs.button)

    await expect(props.onClick).toHaveBeenCalledOnce()
  },
}

export const AsLink: Story = {
  args: {
    mode: Mode.Link,
    to: '/items',
    children: 'Go to Items',
  },
  decorators: [withRouter],
  play: async ({ canvasElement }) => {
    const refs = new ButtonRefs(canvasElement)

    await expect(refs.link).toHaveAttribute('href', '/items')
  },
}
