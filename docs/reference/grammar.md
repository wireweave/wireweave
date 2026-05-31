# Grammar Reference

Complete syntax reference for Wireweave DSL.

## Basic Syntax

### Comments

```wireframe
// Single line comment

/* Multi-line
   comment */
```

### Strings

```wireframe
"Double quoted string"
'Single quoted string'
```

### Numbers

```wireframe
100        // Integer
3.14       // Float
```

### Booleans

```wireframe
true
false
```

## Structure

### Page

```wireframe
page [title] [at(x, y)] [modifiers] {
  [children]
}
```

Examples:

```wireframe
page { }
page "Title" { }
page "Title" centered { }
page "Title" at(0, 0) viewport="1280x800" { }
```

Multiple `page` blocks in the same `.wf` file lay out side-by-side on a wireframe canvas. Pages with `at(x, y)` are pinned to the given canvas coordinates; pages without it auto-flow horizontally with a 64px gap. See [Pages — Multiple Pages on a Canvas](/guide/pages#multiple-pages-on-a-canvas).

### Components

```wireframe
component_name [label] [modifiers] {
  [children]
}
```

Examples:

```wireframe
card { }
card "Title" { }
card shadow=md border { }
button "Click" primary
```

## Components Reference

### Layout

Components that define page structure.

| Component | Description         | Attributes                                    |
| --------- | ------------------- | --------------------------------------------- |
| `page`    | Page root container | title, viewport, device, centered, at, p, gap |
| `header`  | Page header area    | p, border, gap, justify, align                |
| `main`    | Main content area   | p, gap                                        |
| `footer`  | Page footer area    | p, border, gap                                |
| `sidebar` | Sidebar area        | position, w, p, gap                           |
| `section` | Section area        | title, expanded, p, gap                       |

```wireframe
page "Dashboard" {
  header { }
  main { }
  footer { }
}
```

### Grid

Components for flex layout.

| Component | Description                    | Attributes                             |
| --------- | ------------------------------ | -------------------------------------- |
| `row`     | Horizontal flex container      | gap, justify, align, wrap, p, m        |
| `col`     | Vertical container/grid column | span, sm, md, lg, xl, order, gap, p, w |

```wireframe
row gap=4 justify=between {
  col span=6 { }
  col span=6 { }
}
```

### Container

Components for grouping content.

| Component   | Description     | Attributes                    |
| ----------- | --------------- | ----------------------------- |
| `card`      | Card component  | title, p, shadow, border, gap |
| `modal`     | Modal dialog    | title, w, h, p                |
| `drawer`    | Drawer panel    | title, position, p            |
| `accordion` | Accordion panel | title, p                      |

```wireframe
card title="Settings" shadow=md {
  // content
}

modal "Confirm" {
  text "Are you sure?"
  button "OK" primary
}
```

### Text

Components for displaying text.

| Component | Description     | Attributes                    |
| --------- | --------------- | ----------------------------- |
| `text`    | Regular text    | size, weight, align, muted, m |
| `title`   | Heading (h1~h6) | level, size, align, m         |
| `link`    | Hyperlink       | href, external                |

```wireframe
title "Welcome" level=1
text "Description" muted
link "Learn more" href="/docs"
```

### Input

Components for user input.

| Component  | Description      | Attributes                                                                |
| ---------- | ---------------- | ------------------------------------------------------------------------- |
| `input`    | Input field      | label, type, placeholder, value, disabled, required, icon                 |
| `textarea` | Multi-line input | label, placeholder, value, rows, disabled                                 |
| `select`   | Dropdown select  | label, placeholder, value, disabled                                       |
| `checkbox` | Checkbox         | label, checked, disabled                                                  |
| `radio`    | Radio button     | label, name, checked, disabled                                            |
| `switch`   | Toggle switch    | label, checked, disabled                                                  |
| `slider`   | Slider           | label, min, max, value, step, disabled                                    |
| `button`   | Button           | primary, secondary, outline, ghost, danger, size, icon, disabled, loading |

Input types: `text`, `email`, `password`, `number`, `tel`, `url`, `search`, `date`

```wireframe
input "Email" inputType=email placeholder="Enter email"
textarea "Message" rows=4
select "Country" { }
checkbox "Agree" checked
button "Submit" primary
button "Cancel" outline
```

### Display

Components for displaying visual elements.

| Component     | Description | Attributes                |
| ------------- | ----------- | ------------------------- |
| `image`       | Image       | src, alt, w, h            |
| `placeholder` | Placeholder | label, w, h               |
| `avatar`      | Avatar      | name, src, size           |
| `badge`       | Badge       | variant, pill, icon, size |
| `icon`        | Icon        | name, size, muted         |
| `divider`     | Divider     | m, my, mx                 |

```wireframe
image src="/photo.jpg" w=200
avatar "John" size=lg
badge "New" variant=success pill
icon "home" size=md
divider my=4
```

### Data

Components for displaying data.

| Component | Description | Attributes               |
| --------- | ----------- | ------------------------ |
| `table`   | Table       | striped, bordered, hover |
| `list`    | List        | ordered, none, gap       |

```wireframe
table striped hover {
  // columns and rows defined in content
}

list ordered {
  // items
}
```

### Feedback

Components for providing feedback to users.

| Component  | Description        | Attributes                       |
| ---------- | ------------------ | -------------------------------- |
| `alert`    | Alert message      | variant, dismissible, icon       |
| `toast`    | Toast notification | position, variant                |
| `progress` | Progress bar       | value, max, label, indeterminate |
| `spinner`  | Loading spinner    | label, size                      |

Variants: `success`, `warning`, `danger`, `info`

```wireframe
alert "Success!" variant=success
progress value=75 label="Loading..."
spinner size=lg
```

### Overlay

Overlay UI components.

| Component  | Description   | Attributes |
| ---------- | ------------- | ---------- |
| `tooltip`  | Tooltip       | position   |
| `popover`  | Popover       | title      |
| `dropdown` | Dropdown menu | -          |

```wireframe
tooltip "Help text" position=top {
  button "?" outline
}

dropdown {
  // items
}
```

### Navigation

Navigation components.

| Component    | Description     | Attributes    |
| ------------ | --------------- | ------------- |
| `nav`        | Navigation menu | vertical, gap |
| `tabs`       | Tab component   | active        |
| `breadcrumb` | Breadcrumb      | -             |

```wireframe
nav vertical {
  // nav items
}

tabs active=0 {
  // tab panels
}

breadcrumb {
  // breadcrumb items
}
```

## Attribute Syntax

### Key-Value Attributes

```wireframe
component attribute=value
component attribute="string value"
```

Examples:

```wireframe
col span=6
input placeholder="Enter email"
progress value=75
```

### Boolean Attributes

```wireframe
component attribute   // Sets to true
```

Examples:

```wireframe
button primary        // primary=true
input disabled        // disabled=true
checkbox checked      // checked=true
```

## Spacing System

Wireweave uses a spacing token system:

| Token | Value |
| ----- | ----- |
| 0     | 0px   |
| 1     | 4px   |
| 2     | 8px   |
| 3     | 12px  |
| 4     | 16px  |
| 5     | 20px  |
| 6     | 24px  |
| 8     | 32px  |
| 10    | 40px  |
| 12    | 48px  |

```wireframe
card p=4          // padding: 16px
row gap=2         // gap: 8px
text mt=6         // margin-top: 24px
```

## Full Example

```wireframe
page "User Management" centered {
  header border {
    row justify=between align=center {
      title "Admin" level=3
      nav {
        // nav items
      }
      avatar "Admin"
    }
  }

  row {
    sidebar w=200 {
      nav vertical {
        // menu items
      }
    }

    main {
      row justify=between {
        title "Users" level=2
        button "Add User" primary
      }

      card {
        table striped hover {
          // table content
        }
      }

      row justify=center gap=2 {
        button "Previous" secondary
        text "Page 1 of 10"
        button "Next" secondary
      }
    }
  }
}
```
