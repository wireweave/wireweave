import type { Meta, StoryObj } from '@storybook/html'
import { renderDSL } from './_helpers'

const meta: Meta = {
  title: 'Components/Container',
}
export default meta

type Story = StoryObj

export const Card: Story = {
  render: () =>
    renderDSL(`
    page p=4 {
      row gap=4 {
        card "Basic Card" {
          text "Card content goes here."
        }
        card "Shadow Card" shadow=md {
          text "Card with medium shadow."
        }
      }
    }
  `),
}

export const Modal: Story = {
  render: () =>
    renderDSL(`
    page w=600 h=400 {
      modal "Confirm Action" {
        text "Are you sure you want to proceed?"
        row gap=2 justify=end {
          button "Cancel" outline
          button "Confirm" primary
        }
      }
    }
  `),
}

export const Accordion: Story = {
  render: () =>
    renderDSL(`
    page p=4 w=500 {
      col gap=0 {
        accordion "Section 1" {
          text "Content for section 1"
        }
        accordion "Section 2" {
          text "Content for section 2"
        }
        accordion "Section 3" {
          text "Content for section 3"
        }
      }
    }
  `),
}

export const Drawer: Story = {
  render: () =>
    renderDSL(`
    page w=600 h=400 {
      drawer "Settings" position=right {
        col gap=3 {
          text "Drawer content goes here."
          input "Name" placeholder="Enter name"
          button "Save" primary
        }
      }
    }
  `),
}
