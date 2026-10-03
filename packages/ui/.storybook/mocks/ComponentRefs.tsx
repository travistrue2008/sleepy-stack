import { within } from 'storybook/test'

export default class ComponentRefs {
  #canvas: ReturnType<typeof within> = null!

  get canvas () {
    return this.#canvas
  }

  constructor (canvasElement: HTMLElement) {
    this.#canvas = within(canvasElement)
  }
}
