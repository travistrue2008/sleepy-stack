---
paths:
  - "packages/ui/src/**/*.stories.tsx"
---

# Writing Tests

### Do Not Inline References

- Avoid calling `canvas` methods such as `canvas.getBy**()` and `canvas.findBy**()` inside of other function calls
- Do the following instead:
  1. Import the `ComponentRefs` class from `packages/ui/.storybook/mocks/index.ts` into the corresponding `**.stories.tsx`
  2. Make a subclass of `ComponentRefs` called That's named after the component being tested with `Refs` at the end. For example:
    - Component: `Page.stories.tsx`
    - Subclass Name: `PageRefs`
  3. Define instance getters that use `this.canvas` to get the DOM reference for cases where no parameters are needed
  4. Define instance methods that use `this.canvas` to get the DOM reference for cases where parameters are required
  5. List instance getters first and then instance methods second

**DON'T DO THIS**

```tsx
/* Table.stories.tsx */
export const CellCount: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByTestId('header-0')).toBeInTheDocument()
    await expect(canvas.getByTestId('cell-0-0')).toBeInTheDocument()
    await expect(canvas.getByTestId('button-save')).toBeInTheDocument()
  },
}
```

**DO THIS INSTEAD**

```tsx
import Page from './Page' /* component */
import { expect } from 'storybook/test'
import { withRouter } from 'storybook-addon-remix-react-router'
import { ComponentRefs } from '../../../.storybook/mocks'

import type { Meta, StoryObj } from '@storybook/react-vite'

/* subclass */
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
    const refs = new PageRefs(canvasElement) /* create instead */

    await expect(refs.heading).toBeInTheDocument()
    await expect(refs.description).toBeInTheDocument()
    await expect(refs.itemsLink).toHaveAttribute('href', '/items')
  },
}

```

## Router Mocking

The following sections apply to components that import anything from `react-router` (usually hooks or components).

### Hooks

Storybook mocks the following `react-router` hooks in `.storybook/mocks/router.ts`:

- `useNavigate()`
- `useParams()`

The `useNavigate()` hook returns a function when called (it'll always be called `navigate()`). Components that call `useNavigate()` should have test cases for each possible call to the returned `navigate()` function.

We should also assert that any dynamic routes for `<Link>` components are set, and test cases should be written around the state that computes them.

### Scaffolding

- Always use `reactRouterParameters()` to pass `parameters.reactRouter` to the meta `default` export for a default route
<!-- - Always pass `useStoryElement: true` to `reactRouterParameters()` -->
- Always pass `parameters.reactRouter` to `reactRouterParameters()`
