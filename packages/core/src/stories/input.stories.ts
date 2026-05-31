import type { Meta, StoryObj } from '@storybook/html'
import { renderDSL } from './_helpers'

const meta: Meta = {
  title: 'Components/Input',
}
export default meta

type Story = StoryObj

export const TextInput: Story = {
  render: () =>
    renderDSL(`
    page p=4 w=400 {
      col gap=3 {
        input "Email address" placeholder="you@example.com"
        input "Password" type=password
        input "Disabled" disabled
      }
    }
  `),
}

export const InputWithIcon: Story = {
  render: () =>
    renderDSL(`
    page p=4 w=400 {
      input "Search" icon=search placeholder="Search..."
    }
  `),
}

export const Textarea: Story = {
  render: () =>
    renderDSL(`
    page p=4 w=400 {
      col gap=3 {
        textarea "Description" placeholder="Enter description..."
        textarea "Notes" rows=6
      }
    }
  `),
}

export const Select: Story = {
  render: () =>
    renderDSL(`
    page p=4 w=400 {
      col gap=3 {
        select "Country" ["Korea", "Japan", "USA", "UK"]
        select "Disabled" ["Option A", "Option B"] disabled
      }
    }
  `),
}

export const Checkbox: Story = {
  render: () =>
    renderDSL(`
    page p=4 w=400 {
      col gap=2 {
        checkbox "Accept terms" checked
        checkbox "Subscribe to newsletter"
        checkbox "Disabled option" disabled
      }
    }
  `),
}

export const Radio: Story = {
  render: () =>
    renderDSL(`
    page p=4 w=400 {
      col gap=2 {
        radio "Small" name=size
        radio "Medium" name=size checked
        radio "Large" name=size
      }
    }
  `),
}

export const Switch: Story = {
  render: () =>
    renderDSL(`
    page p=4 w=400 {
      col gap=2 {
        switch "Dark mode" checked
        switch "Notifications"
      }
    }
  `),
}

export const Slider: Story = {
  render: () =>
    renderDSL(`
    page p=4 w=400 {
      col gap=3 {
        slider value=60
        slider min=0 max=100 value=30
      }
    }
  `),
}

export const FormField: Story = {
  render: () =>
    renderDSL(`
    page p=4 w=400 {
      col gap=3 {
        input "Full Name" placeholder="John Doe"
        input "Email" placeholder="john@example.com"
        select "Role" ["Admin", "Editor", "Viewer"]
        textarea "Bio" placeholder="Tell us about yourself..."
        row gap=4 {
          checkbox "Active"
          switch "Verified"
        }
      }
    }
  `),
}
