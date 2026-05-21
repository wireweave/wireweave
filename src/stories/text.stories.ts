import type { Meta, StoryObj } from '@storybook/html'
import { renderDSL } from './_helpers'

const meta: Meta = {
  title: 'Components/Text',
}
export default meta

type Story = StoryObj

export const Paragraphs: Story = {
  render: () =>
    renderDSL(`
    page p=4 {
      text "Default text paragraph with normal styling."
      text "Small text" size=sm
      text "Large text" size=lg
      text "Extra large text" size=xl
      text "Muted text for secondary information" muted
    }
  `),
}

export const Titles: Story = {
  render: () =>
    renderDSL(`
    page p=4 {
      title "Heading 1" level=1
      title "Heading 2" level=2
      title "Heading 3" level=3
      title "Heading 4" level=4
      title "Heading 5" level=5
      title "Heading 6" level=6
    }
  `),
}

export const Links: Story = {
  render: () =>
    renderDSL(`
    page p=4 {
      link "Click here" href="#"
      text "Read more about our project"
      link "Documentation" href="#"
    }
  `),
}

export const FontWeights: Story = {
  render: () =>
    renderDSL(`
    page p=4 {
      text "Normal weight" weight=normal
      text "Medium weight" weight=medium
      text "Semibold weight" weight=semibold
      text "Bold weight" weight=bold
    }
  `),
}
