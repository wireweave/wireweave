import type { Preview } from '@storybook/html';
import { generateStyles } from '../src/renderer/styles';
import { defaultTheme } from '../src/renderer/types';

/**
 * Generate wireweave CSS for injection into stories.
 */
const wireweaveCSS = generateStyles(defaultTheme);

const preview: Preview = {
  decorators: [
    (story) => {
      const container = document.createElement('div');

      // Inject wireweave CSS
      const style = document.createElement('style');
      style.textContent = wireweaveCSS;
      container.appendChild(style);

      // Render story content
      const content = story();
      if (typeof content === 'string') {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = content;
        container.appendChild(wrapper);
      } else if (content instanceof HTMLElement) {
        container.appendChild(content);
      }

      return container;
    },
  ],
};

export default preview;
