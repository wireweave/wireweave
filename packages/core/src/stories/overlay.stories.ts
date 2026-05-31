import type { Meta, StoryObj } from '@storybook/html'
import { renderDSL } from './_helpers'

const meta: Meta = {
  title: 'Components/Overlay',
}
export default meta

type Story = StoryObj

export const Tooltip: Story = {
  render: () =>
    renderDSL(`
    page p=48 {
      tooltip "Helpful tip" position=top
      tooltip "Bottom tip" position=bottom
    }
  `),
}

export const Popover: Story = {
  render: () =>
    renderDSL(`
    page p=48 {
      popover "More Info" {
        text "Click for more info about this feature."
      }
    }
  `),
}

export const Dropdown: Story = {
  render: () =>
    renderDSL(`
    page p=4 {
      dropdown ["Edit", "Duplicate", "Archive", "---", "Delete"]
    }
  `),
}
