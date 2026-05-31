# Components

Wireweave provides semantic UI components for building wireframes quickly.

## Component Categories

Wireweave components are organized into 11 categories:

| Category       | Purpose               | Components                                                       |
| -------------- | --------------------- | ---------------------------------------------------------------- |
| **Layout**     | Page structure        | page, header, main, footer, sidebar, section, divider            |
| **Grid**       | Flex layout           | row, col, stack, relative                                        |
| **Container**  | Content grouping      | card, modal, drawer, accordion                                   |
| **Text**       | Text display          | text, title, link                                                |
| **Input**      | User input            | input, textarea, select, checkbox, radio, switch, slider, button |
| **Display**    | Visual elements       | image, placeholder, avatar, badge, icon                          |
| **Data**       | Data display          | table, list                                                      |
| **Feedback**   | Status feedback       | alert, toast, progress, spinner                                  |
| **Overlay**    | Overlay UI            | tooltip, popover, dropdown                                       |
| **Navigation** | Navigation            | nav, tabs, breadcrumb                                            |
| **Annotation** | Documentation markers | marker, annotations, item                                        |

## Layout

Defines the overall page structure. Every wireframe starts with `page`.

```wireframe
page "Dashboard" {
  header {
    // logo, navigation
  }
  main {
    // main content
  }
  footer {
    // copyright, links
  }
}
```

Add `sidebar` to create a dashboard layout:

```wireframe
page {
  header { }
  row {
    sidebar w=240 { }
    main { }
  }
}
```

## Grid

Build flexible layouts with `row` and `col`.

```wireframe
row gap=4 justify=between {
  col span=8 {
    // main area (8/12)
  }
  col span=4 {
    // side area (4/12)
  }
}
```

Also useful for simple horizontal arrangements like button groups:

```wireframe
row gap=2 justify=end {
  button "Cancel" secondary
  button "Save" primary
}
```

## Container

Visually group content together.

**card** - The most commonly used container:

```wireframe
card title="User Profile" {
  avatar "John"
  text "john@example.com"
}
```

**modal** - When user confirmation is needed:

```wireframe
modal "Delete Item?" {
  text "This action cannot be undone."
  row justify=end gap=2 {
    button "Cancel" secondary
    button "Delete" danger
  }
}
```

## Text

Display text content.

```wireframe
title "Welcome" level=1
text "Main description here"
text "Secondary info" muted
link "Learn more" href="/docs"
```

## Input

Handle forms and user input.

**Basic form pattern:**

```wireframe
card {
  title "Login" level=2
  input "Email" inputType=email
  input "Password" inputType=password
  checkbox "Remember me"
  button "Sign In" primary
}
```

**Various input components:**

```wireframe
select "Country" placeholder="Select..."
switch "Notifications" checked
slider "Volume" min=0 max=100 value=50
```

## Display

Show visual elements.

```wireframe
row gap=4 align=center {
  avatar "John" size=lg
  col {
    text "John Doe" weight=bold
    badge "Admin" variant=success
  }
}

divider my=4

placeholder "Product Image" w=300 h=200
```

## Data

Display structured data.

```wireframe
table striped hover {
  // table data
}

list ordered {
  // ordered list
}
```

## Feedback

Communicate status to users.

```wireframe
alert "Changes saved successfully" variant=success

progress value=75 label="Uploading..."

spinner label="Loading..."
```

## Overlay

Display additional info or menus as overlays.

```wireframe
tooltip "Click to save" {
  button "Save" primary
}

dropdown {
  // dropdown menu items
}
```

## Navigation

Components for page navigation.

```wireframe
nav {
  // horizontal navigation
}

tabs active=0 {
  // tab panels
}

breadcrumb {
  // path display
}
```

## Common Patterns

### Login Form

```wireframe
page "Login" centered {
  card w=400 p=6 {
    title "Sign In" level=2 align=center
    input "Email" inputType=email
    input "Password" inputType=password
    row justify=between align=center {
      checkbox "Remember me"
      link "Forgot password?"
    }
    button "Sign In" primary
    divider my=4
    button "Continue with Google" outline
  }
}
```

### Dashboard

```wireframe
page "Dashboard" {
  header border {
    row justify=between align=center {
      title "Admin" level=3
      avatar "User"
    }
  }
  row {
    sidebar w=200 {
      nav vertical { }
    }
    main {
      row gap=4 {
        card { title "Users" text "1,234" }
        card { title "Revenue" text "$56K" }
        card { title "Orders" text "890" }
      }
    }
  }
}
```

## Next Steps

- [Layouts Guide](/guide/layouts) - Layout details
- [Styling Guide](/guide/styling) - Styling options
- [Components Reference](/reference/components) - All attributes in detail
