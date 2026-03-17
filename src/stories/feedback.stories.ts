import type { Meta, StoryObj } from '@storybook/html';
import { renderDSL } from './_helpers';

const meta: Meta = {
  title: 'Components/Feedback',
};
export default meta;

type Story = StoryObj;

export const Alerts: Story = {
  render: () => renderDSL(`
    page p=4 {
      alert "This is an info message." variant=info
      alert "Operation completed successfully." variant=success
      alert "Please review before proceeding." variant=warning
      alert "An error has occurred." variant=danger dismissible
    }
  `),
};

export const Toast: Story = {
  render: () => renderDSL(`
    page p=4 {
      toast "File saved successfully."
    }
  `),
};

export const Progress: Story = {
  render: () => renderDSL(`
    page p=4 {
      col gap=4 {
        progress value=75
        progress value=30 label="Uploading..."
        progress indeterminate
      }
    }
  `),
};

export const Spinner: Story = {
  render: () => renderDSL(`
    page p=4 {
      row gap=4 align=center {
        spinner size=xs
        spinner size=sm
        spinner
        spinner size=lg
        spinner size=xl
      }
    }
  `),
};
