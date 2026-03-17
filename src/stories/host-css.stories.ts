import type { Meta, StoryObj } from '@storybook/html';
import { parse, render } from '../index';

const meta: Meta = {
  title: 'Tests/Host CSS Isolation',
};
export default meta;

type Story = StoryObj;

/**
 * Aggressive host CSS that simulates interference from Claude Desktop,
 * markdown renderers, VS Code webviews, etc.
 */
const hostCSS = `
input { font-family: 'Host Sans'; border-radius: 8px; border: 2px solid blue; padding: 12px; }
button { font-family: 'Host Sans'; border-radius: 12px; background: #eee; color: green; padding: 16px; }
a { color: red; text-decoration: underline wavy; font-size: 20px; }
table { border: 3px solid green; border-spacing: 8px; }
th, td { padding: 20px; background: lightyellow; }
h1, h2, h3, h4, h5, h6 { color: purple; font-family: 'Host Serif'; margin: 24px 0; }
p { line-height: 2.5; letter-spacing: 3px; color: orange; }
select { border: 3px dashed red; background: pink; }
textarea { border: 3px dashed red; background: lightyellow; }
ul, ol { padding: 40px; }
li { color: magenta; padding: 16px; }
hr { border: 5px solid red; }
label { color: blue; font-size: 24px; }
nav { background: lightblue; padding: 20px; }
`;

function renderWithHostCSS(dsl: string): string {
  const doc = parse(dsl);
  const { html, css } = render(doc);
  return `
    <style>${hostCSS}</style>
    <style>${css}</style>
    <div>
      <h3 style="font-family: system-ui; color: #666; margin-bottom: 8px;">Host CSS active (red borders, purple headings, etc.)</h3>
      <p style="font-family: system-ui; color: #999; margin-bottom: 16px; line-height: 1.4; letter-spacing: normal;">
        Elements below should NOT be affected by the host CSS above.
      </p>
      ${html}
    </div>
  `;
}

export const FormElements: Story = {
  render: () => renderWithHostCSS(`
    page p=4 w=500 {
      col gap=3 {
        input "Email" placeholder="you@example.com"
        input "Password" type=password
        select "Role" ["Admin", "Editor", "Viewer"]
        textarea "Bio" placeholder="Tell us..."
        row gap=2 {
          checkbox "Accept terms" checked
          switch "Notifications"
        }
        row gap=2 {
          button "Cancel" outline
          button "Submit" primary
        }
      }
    }
  `),
};

export const TextElements: Story = {
  render: () => renderWithHostCSS(`
    page p=4 w=500 {
      title "Main Heading" level=1
      title "Sub Heading" level=2
      title "Section Title" level=3
      text "This is a paragraph of text that should have normal line-height and letter-spacing."
      text "Muted text" muted
      link "Click this link" href="#"
    }
  `),
};

export const TableAndList: Story = {
  render: () => renderWithHostCSS(`
    page p=4 w=600 {
      table {
        columns ["Name", "Email", "Role"]
        row ["Alice", "alice@example.com", "Admin"]
        row ["Bob", "bob@example.com", "Editor"]
      }
      list ["First item", "Second item"]
      list ["Step one", "Step two"] ordered
    }
  `),
};

export const NavigationElements: Story = {
  render: () => renderWithHostCSS(`
    page w=600 {
      nav ["Home", "About", "Contact"]
      divider
      tabs ["Overview", "Activity"]
      divider
      breadcrumb ["Home", "Products", "Detail"]
    }
  `),
};

export const CompletePageWithHostCSS: Story = {
  render: () => renderWithHostCSS(`
    page w=800 h=600 {
      header {
        row justify=between align=center {
          text "Dashboard" weight=bold size=lg
          row gap=2 {
            button "" icon=bell ghost
            avatar "JD"
          }
        }
      }
      row {
        sidebar {
          nav ["Home", "Projects", "Settings"] vertical
        }
        main {
          title "Welcome Back" level=2
          row gap=4 {
            card "Revenue" {
              text "$12,345" size=2xl weight=bold
            }
            card "Users" {
              text "1,234" size=2xl weight=bold
            }
          }
          table striped {
            columns ["Name", "Status", "Action"]
            row ["Project A", "Active", "Edit"]
            row ["Project B", "Draft", "Edit"]
          }
        }
      }
      footer {
        text "2024 Dashboard" muted size=sm
      }
    }
  `),
};
