import type { Meta, StoryObj } from '@storybook/html';
import { renderDSL } from './_helpers';

const meta: Meta = {
  title: 'Components/Navigation',
};
export default meta;

type Story = StoryObj;

export const HorizontalNav: Story = {
  render: () => renderDSL(`
    page p=4 {
      nav ["Home", "About", "Contact"]
    }
  `),
};

export const VerticalNav: Story = {
  render: () => renderDSL(`
    page p=4 {
      nav ["Dashboard", "Projects", "Settings"] vertical
    }
  `),
};

export const Tabs: Story = {
  render: () => renderDSL(`
    page p=4 {
      tabs ["Overview", "Activity", "Settings"]
    }
  `),
};

export const Breadcrumb: Story = {
  render: () => renderDSL(`
    page p=4 {
      breadcrumb ["Home", "Products", "Detail"]
    }
  `),
};
