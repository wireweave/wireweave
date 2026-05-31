import type { Meta, StoryObj } from '@storybook/html'
import { renderDSL } from './_helpers'

const meta: Meta = {
  title: 'Components/Data',
}
export default meta

type Story = StoryObj

export const BasicTable: Story = {
  render: () =>
    renderDSL(`
    page p=4 {
      table {
        columns ["Name", "Email", "Role"]
        row ["Alice", "alice@example.com", "Admin"]
        row ["Bob", "bob@example.com", "Editor"]
        row ["Charlie", "charlie@example.com", "Viewer"]
      }
    }
  `),
}

export const StripedTable: Story = {
  render: () =>
    renderDSL(`
    page p=4 {
      table striped {
        columns ["Product", "Price", "Stock"]
        row ["Widget A", "$9.99", "150"]
        row ["Widget B", "$19.99", "85"]
        row ["Widget C", "$29.99", "42"]
        row ["Widget D", "$39.99", "0"]
      }
    }
  `),
}

export const UnorderedList: Story = {
  render: () =>
    renderDSL(`
    page p=4 {
      list ["First item", "Second item", "Third item"]
    }
  `),
}

export const OrderedList: Story = {
  render: () =>
    renderDSL(`
    page p=4 {
      list ["Step one", "Step two", "Step three"] ordered
    }
  `),
}
