import type { Meta, StoryObj } from '@storybook/html'
import { renderDSL } from './_helpers'

const meta: Meta = {
  title: 'Components/Button',
}
export default meta

type Story = StoryObj

export const Default: Story = {
  render: () =>
    renderDSL(`
    page p=4 {
      row gap=2 {
        button "Default"
        button "Primary" primary
        button "Outline" outline
        button "Ghost" ghost
        button "Danger" danger
      }
    }
  `),
}

export const Sizes: Story = {
  render: () =>
    renderDSL(`
    page p=4 {
      row gap=2 align=center {
        button "XS" size=xs
        button "SM" size=sm
        button "MD" size=md
        button "LG" size=lg
        button "XL" size=xl
      }
    }
  `),
}

export const WithIcon: Story = {
  render: () =>
    renderDSL(`
    page p=4 {
      row gap=2 {
        button "Save" icon=save primary
        button "Delete" icon=trash danger
        button "" icon=settings
      }
    }
  `),
}

export const States: Story = {
  render: () =>
    renderDSL(`
    page p=4 {
      row gap=2 {
        button "Normal"
        button "Disabled" disabled
        button "Loading" loading
      }
    }
  `),
}
