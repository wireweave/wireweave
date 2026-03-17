import type { Meta, StoryObj } from '@storybook/html';
import { renderDSL } from './_helpers';

const meta: Meta = {
  title: 'Components/Display',
};
export default meta;

type Story = StoryObj;

export const Placeholder: Story = {
  render: () => renderDSL(`
    page p=4 {
      row gap=4 {
        placeholder w=300 h=200
        placeholder "Hero Image" w=400 h=150
      }
    }
  `),
};

export const Avatar: Story = {
  render: () => renderDSL(`
    page p=4 {
      row gap=2 align=center {
        avatar "AB"
        avatar "CD"
        avatar "EF"
      }
    }
  `),
};

export const Badge: Story = {
  render: () => renderDSL(`
    page p=4 {
      row gap=2 {
        badge "New"
        badge "Pro" primary
        badge "3" pill
      }
    }
  `),
};

export const Icon: Story = {
  render: () => renderDSL(`
    page p=4 {
      row gap=2 {
        icon "home"
        icon "settings"
        icon "user"
        icon "search"
        icon "bell"
      }
    }
  `),
};

export const Image: Story = {
  render: () => renderDSL(`
    page p=4 {
      row gap=4 {
        image src="https://placehold.co/200x150" alt="Sample" w=200 h=150
        image src="https://placehold.co/200x150" alt="Rounded" w=200 h=150 rounded
      }
    }
  `),
};
