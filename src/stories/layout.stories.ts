import type { Meta, StoryObj } from '@storybook/html'
import { renderDSL } from './_helpers'

const meta: Meta = {
  title: 'Components/Layout',
}
export default meta

type Story = StoryObj

export const HeaderFooter: Story = {
  render: () =>
    renderDSL(`
    page w=800 h=400 {
      header {
        text "My App" weight=bold
      }
      main {
        text "Main content area"
      }
      footer {
        text "Footer content" muted size=sm
      }
    }
  `),
}

export const SidebarLayout: Story = {
  render: () =>
    renderDSL(`
    page w=800 h=400 {
      header {
        text "Dashboard" weight=bold
      }
      row {
        sidebar {
          nav ["Home", "Analytics", "Settings"] vertical
        }
        main {
          title "Welcome" level=2
          text "Main content goes here."
        }
      }
    }
  `),
}

export const Stack: Story = {
  render: () =>
    renderDSL(`
    page p=4 w=400 {
      stack gap=2 {
        text "Stack takes only content height"
        text "Unlike col, it does not stretch to fill"
        button "Action" primary
      }
    }
  `),
}

export const Section: Story = {
  render: () =>
    renderDSL(`
    page p=4 {
      section {
        title "Section 1" level=3
        text "Content for section 1"
      }
      section {
        title "Section 2" level=3
        text "Content for section 2"
      }
    }
  `),
}
