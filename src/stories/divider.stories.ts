import type { Meta, StoryObj } from '@storybook/html';
import { renderDSL } from './_helpers';

const meta: Meta = {
  title: 'Components/Divider',
};
export default meta;

type Story = StoryObj;

export const Horizontal: Story = {
  render: () => renderDSL(`
    page p=4 {
      text "Above the divider"
      divider
      text "Below the divider"
    }
  `),
};

export const Vertical: Story = {
  render: () => renderDSL(`
    page p=4 {
      row h=60 align=center {
        text "Left"
        divider
        text "Right"
      }
    }
  `),
};
