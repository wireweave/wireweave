# Layouts

Wireweave provides flexible layout options for organizing your wireframe content.

## Page Layouts

### Basic Layout

```wireframe
page "Basic" {
  header { }
  main { }
  footer { }
}
```

### Sidebar Layout

```wireframe
page "Dashboard" {
  header { }
  row {
    sidebar { }
    main { }
  }
  footer { }
}
```

### Two Column Layout

```wireframe
page "Blog" {
  main {
    row {
      col span=8 { }
      col span=4 { }
    }
  }
}
```

## Layout Components

### Row

Horizontal arrangement:

```wireframe
row {
  card { }
  card { }
  card { }
}
```

### Col

Vertical sections with grid column width:

```wireframe
row {
  col span=6 {
    // half width
  }
  col span=6 {
    // half width
  }
}
```

### Responsive Columns

Use responsive breakpoints for different screen sizes:

```wireframe
row {
  col span=12 md=6 lg=4 {
    // full on mobile, half on tablet, 1/3 on desktop
  }
  col span=12 md=6 lg=4 {
    // full on mobile, half on tablet, 1/3 on desktop
  }
  col span=12 md=12 lg=4 {
    // full on mobile/tablet, 1/3 on desktop
  }
}
```

### Stack

Vertical stack that only takes content height. Unlike `col`, stack does not flex to fill available space.

```wireframe
stack gap=4 {
  text "Item 1"
  text "Item 2"
  text "Item 3"
}
```

Stack is perfect for centering content:

```wireframe
row justify=center align=center h=300 {
  stack align=center gap=4 {
    icon "star" size=xl
    text "Centered Content"
    button "Action" primary
  }
}
```

**Attributes:**

- `gap` - Space between items
- `align` - Cross axis alignment: `start`, `center`, `end`, `stretch`
- `border` - Show border
- `bg` - Background: `muted`, `primary`, `secondary`

### Relative

Container for overlaying elements with absolute positioning. Children can use `x` and `y` attributes for precise placement.

```wireframe
relative w=300 h=200 {
  image w=full h=full
  badge "New" x=10 y=10
}
```

Overlay text on image:

```wireframe
relative {
  image w=full h=200
  col x=16 y=160 {
    text "Photo Title" weight=bold
    text "Description" size=sm muted
  }
}
```

**Use cases:**

- Badges on product images
- Text overlays on hero images
- Floating action buttons
- Watermarks

### Scrollable Content

Use `scroll` attribute to make content scrollable:

```wireframe
page {
  header { text "Fixed Header" }
  main scroll {
    // scrollable content
    card { text "Item 1" }
    card { text "Item 2" }
    card { text "Item 3" }
  }
  footer { text "Fixed Footer" }
}
```

## Alignment

### Horizontal Alignment (justify)

```wireframe
row justify=start {
  // left aligned (default)
}

row justify=center {
  // horizontally centered
}

row justify=end {
  // right aligned
}
```

### Vertical Alignment (align)

```wireframe
row align=start {
  // top aligned
}

row align=center {
  // vertically centered
}

row align=end {
  // bottom aligned
}
```

### Distribution

```wireframe
row justify=between {
  // space between items
}

row justify=around {
  // space around items
}

row justify=evenly {
  // equal space between items
}
```

## Spacing

### Padding

```wireframe
card p=16 {
  // 16px padding
}

card p=24 {
  // 24px padding
}

card px=16 py=8 {
  // horizontal 16px, vertical 8px
}
```

### Gap

```wireframe
row gap=8 {
  // 8px gap between items
}

col gap=16 {
  // 16px gap between items
}
```

### Margin

```wireframe
section m=32 {
  // 32px margin
}

card mt=16 mb=8 {
  // top 16px, bottom 8px
}
```

## Responsive Hints

Wireweave supports responsive breakpoints:

| Breakpoint  | Prefix | Min Width |
| ----------- | ------ | --------- |
| Small       | `sm`   | 576px     |
| Medium      | `md`   | 768px     |
| Large       | `lg`   | 992px     |
| Extra Large | `xl`   | 1200px    |

```wireframe
row wrap {
  col span=12 sm=6 md=4 lg=3 {
    // responsive column widths
  }
}
```

## Common Patterns

### Card Grid

```wireframe
row gap=24 wrap {
  col span=12 md=4 {
    card {
      image "Product 1"
      title "Product Name" level=4
      text "$99.00"
      button "Add to Cart"
    }
  }
  col span=12 md=4 {
    card {
      image "Product 2"
      title "Product Name" level=4
      text "$99.00"
      button "Add to Cart"
    }
  }
  col span=12 md=4 {
    card {
      image "Product 3"
      title "Product Name" level=4
      text "$99.00"
      button "Add to Cart"
    }
  }
}
```

### Form Layout

```wireframe
card p=24 {
  col gap=16 {
    title "Contact Form" level=2
    input "Name"
    input "Email" inputType=email
    textarea "Message"
    row justify=end gap=8 {
      button "Cancel" secondary
      button "Submit" primary
    }
  }
}
```

### Dashboard Layout

```wireframe
page "Dashboard" {
  header border {
    row justify=between align=center px=16 {
      title "App" level=3
      nav { }
    }
  }
  row {
    sidebar w=240 {
      nav vertical { }
    }
    main p=24 {
      row gap=16 wrap {
        col span=6 lg=3 {
          card { title "Users" level=4 text "1,234" }
        }
        col span=6 lg=3 {
          card { title "Revenue" level=4 text "$56,789" }
        }
        col span=6 lg=3 {
          card { title "Orders" level=4 text "890" }
        }
        col span=6 lg=3 {
          card { title "Growth" level=4 text "+12%" }
        }
      }
    }
  }
}
```

## Next Steps

- [Styling Guide](/guide/styling) - Customize colors and themes
- [Components Reference](/reference/components) - All components
