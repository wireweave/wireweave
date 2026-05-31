import type { Meta, StoryObj } from '@storybook/html'
import { parse, renderCanvas } from '../index'

/**
 * Canvas stories — bounded layout only.
 *
 * `renderCanvas` returns a single bounded `<div class="wf-canvas">` containing
 * absolutely-positioned `<div class="wf-canvas-board">` wrappers. There is no
 * chrome, no grid, no labels, no decoration — those are host responsibilities
 * (dashboard editor for infinite canvas, markdown plugin for inline preview,
 * vscode-extension for sidebar preview).
 *
 * These stories show the raw output. To see the dashboard's Figma-style
 * infinite canvas viewer, run the dashboard package's Storybook.
 */
function renderCanvasDSL(dsl: string): string {
  const doc = parse(dsl)
  const { html } = renderCanvas(doc)
  return html
}

const meta: Meta = {
  title: 'Canvas/Multi-page',
  parameters: {
    layout: 'fullscreen',
  },
}
export default meta

type Story = StoryObj

const sideBySideDsl = `
  page "Login" at(0, 0) viewport="1280x800" centered {
    card "Sign in" w=400 p=8 gap=4 {
      input "Email" inputType=email required
      input "Password" inputType=password required
      button "Sign in" primary w=full
    }
  }
  page "Dashboard" at(1344, 0) viewport="1280x800" {
    header h=56 border { text "App" weight=bold }
    main p=6 gap=4 {
      text "Welcome back" size=2xl weight=bold
      table striped {
        columns ["Name", "Status"]
        row ["Project A", "Active"]
        row ["Project B", "Draft"]
      }
    }
  }
`

const autoFlowDsl = `
  page "Step 1" viewport="1280x800" centered {
    card "Account" w=480 p=8 gap=4 {
      input "Email" inputType=email required
      button "Next" primary w=full
    }
  }
  page "Step 2" viewport="1280x800" centered {
    card "Profile" w=480 p=8 gap=4 {
      input "Name" required
      input "Phone" inputType=tel
      button "Next" primary w=full
    }
  }
  page "Step 3" viewport="1280x800" centered {
    card "Confirm" w=480 p=8 gap=4 {
      text "All set." size=lg weight=semibold
      button "Finish" primary w=full
    }
  }
`

const mixedViewportDsl = `
  page "Desktop" at(0, 0) viewport="1280x800" {
    header h=56 border { text "App" weight=bold }
    main p=6 gap=4 {
      text "Desktop layout" size=2xl weight=bold
      row gap=4 {
        card "Revenue" { text "$12,345" size=2xl weight=bold }
        card "Users"   { text "1,234"   size=2xl weight=bold }
      }
    }
  }
  page "Mobile" at(0, 832) viewport="375x812" {
    header h=48 border { text "App" weight=bold }
    main p=4 gap=3 {
      text "Mobile layout" size=lg weight=bold
      card "Revenue" { text "$12k" size=xl weight=bold }
      card "Users"   { text "1.2k" size=xl weight=bold }
    }
  }
`

const mosaicDsl = `
  page "Login" at(0, 0) viewport="800x600" centered {
    card "Sign in" w=400 p=6 gap=4 {
      input "Email" inputType=email required
      button "Sign in" primary w=full
    }
  }
  page "Dashboard" at(864, 0) viewport="800x600" centered {
    card "Today" w=400 p=6 gap=4 {
      text "Welcome back" size=lg weight=semibold
      text "3 tasks pending" size=md
    }
  }
  page "Profile" at(1728, 0) viewport="800x600" centered {
    card "Profile" w=400 p=6 gap=4 {
      input "Name" required
      button "Save" primary w=full
    }
  }
  page "Settings" at(0, 664) viewport="800x600" centered {
    card "Preferences" w=400 p=6 gap=4 {
      checkbox "Email updates"
      checkbox "Dark mode"
      button "Save" primary w=full
    }
  }
  page "Billing" at(864, 664) viewport="800x600" centered {
    card "Plan" w=400 p=6 gap=4 {
      text "Pro" size=lg weight=semibold
      text "$9 / mo" size=xl weight=bold
      button "Upgrade" primary w=full
    }
  }
  page "Support" at(1728, 664) viewport="800x600" centered {
    card "Help" w=400 p=6 gap=4 {
      text "Contact us" size=md
      button "Open chat" primary w=full
    }
  }
`

/**
 * Two pages pinned at explicit canvas coordinates — pure positioning,
 * no decoration. This is the raw `renderCanvas` output that hosts wrap
 * with their own viewport / grid / pan-zoom layer.
 */
export const ExplicitAt: Story = {
  name: 'Explicit at(x, y)',
  render: () => renderCanvasDSL(sideBySideDsl),
}

/**
 * Three pages without coordinates — auto-flow horizontally with the
 * default 64px gap.
 */
export const AutoFlow: Story = {
  name: 'Auto-flow (no at)',
  render: () => renderCanvasDSL(autoFlowDsl),
}

/**
 * Desktop board (1280x800) and mobile board (375x812) coexist on one
 * canvas. Bounding box automatically grows to fit both — useful for
 * design reviews showing responsive intent at a glance.
 */
export const MixedViewports: Story = {
  name: 'Mixed viewport (desktop + mobile)',
  render: () => renderCanvasDSL(mixedViewportDsl),
}

/**
 * Six wireframes laid out in a 3×2 mosaic via explicit at(x, y) — proves
 * the canvas works in both axes (Figma-style 2D arrangement), not just
 * horizontal auto-flow.
 */
export const Mosaic: Story = {
  name: 'Mosaic 3×2',
  render: () => renderCanvasDSL(mosaicDsl),
}
