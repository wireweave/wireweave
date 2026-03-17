import type { StorybookConfig } from '@storybook/html-vite';

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.ts'],
  framework: '@storybook/html-vite',
};

export default config;
