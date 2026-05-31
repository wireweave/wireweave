# Pages

Every Wireweave wireframe starts with a `page` component - the root container for all content.

## Basic Page

```wireframe
page {
  // content goes here
}
```

## Page Title

Give your page a title:

```wireframe
page "Login" {
  // content
}
```

The title appears in the wireframe header and can be used for documentation.

## Page Themes

Set the color theme for the entire page:

```wireframe
page "Dashboard" theme:light {
  // light theme (default)
}

page "Dashboard" theme:dark {
  // dark theme
}
```

## Page Layout

### Full Width

```wireframe
page fullWidth {
  // content spans full width
}
```

### Centered Content

```wireframe
page center {
  // content is centered
}
```

### Max Width

```wireframe
page maxWidth:1200 {
  // content limited to 1200px
}
```

## Common Page Structures

### Landing Page

```wireframe
page "Home" {
  navbar {
    logo "Brand"
    nav { link "Features" link "Pricing" link "About" }
    button "Sign Up" primary
  }

  section hero center {
    heading "Welcome to Our Product"
    text "The best solution for your needs"
    button "Get Started" primary
  }

  section features {
    grid columns:3 {
      card { heading "Fast" text "Lightning quick performance" }
      card { heading "Simple" text "Easy to use interface" }
      card { heading "Secure" text "Enterprise-grade security" }
    }
  }

  footer {
    text "Copyright 2026"
  }
}
```

### Dashboard

```wireframe
page "Dashboard" {
  navbar {
    logo "App"
    nav { link "Dashboard" active link "Settings" }
    avatar "User"
  }

  row {
    sidebar width:240 {
      menu {
        item "Overview"
        item "Analytics"
        item "Reports"
        item "Settings"
      }
    }

    main {
      heading "Overview"
      grid columns:4 {
        card { text "Users" heading "1,234" }
        card { text "Revenue" heading "$56,789" }
        card { text "Orders" heading "890" }
        card { text "Growth" heading "+12%" }
      }

      card {
        heading "Recent Activity"
        table { ... }
      }
    }
  }
}
```

### Auth Pages

```wireframe
page "Login" center {
  card width:400 {
    heading "Welcome Back"
    text "Sign in to your account"

    input "Email" email
    input "Password" password

    row justify:between {
      checkbox "Remember me"
      link "Forgot password?"
    }

    button "Sign In" primary fullWidth

    divider "or"

    button "Continue with Google" secondary fullWidth
  }
}
```

### Settings Page

```wireframe
page "Settings" {
  navbar { ... }

  row {
    sidebar {
      menu {
        item "Profile"
        item "Account"
        item "Security"
        item "Notifications"
      }
    }

    main {
      heading "Profile Settings"

      card {
        row gap:24 {
          avatar "User" size:80
          stack {
            heading "John Doe" level:3
            text "john@example.com" muted
            button "Change Photo" secondary
          }
        }
      }

      card {
        heading "Personal Information" level:3
        form {
          row gap:16 {
            input "First Name" text
            input "Last Name" text
          }
          input "Email" email
          input "Bio" textarea

          row justify:end {
            button "Cancel" secondary
            button "Save Changes" primary
          }
        }
      }
    }
  }
}
```

## Multiple Pages on a Canvas

Declare several `page` blocks in a single `.wf` file to lay them out side-by-side on a wireframe canvas.

### Auto-flow

Pages without explicit coordinates flow horizontally, with a default 64px gap:

```wireframe
page "Login" viewport="375x812" {
  // mobile auth screen
}

page "Verify Code" viewport="375x812" {
  // SMS code entry
}

page "Welcome" viewport="375x812" {
  // post-signup landing
}
```

### Explicit placement with `at(x, y)`

Use `at(x, y)` to pin a page at canvas coordinates. Pages with `at(...)` are placed exactly where you ask; pages without continue to auto-flow.

```wireframe
page "Login" at(0, 0) viewport="1280x800" {
  // ...
}

page "Dashboard" at(1400, 0) viewport="1280x800" {
  // ...
}

page "Settings" at(1400, 900) viewport="1280x800" {
  // ...
}
```

Use auto-flow for linear journeys; use `at(x, y)` when the canvas itself communicates structure (parallel branches, before/after pairs, app sections).

### Showing flow within a single page

If you want a single page to _narrate_ a flow without splitting into pages, use sections:

```wireframe
page "User Flow" {
  section "Step 1: Login"     { card { ... } }
  section "Step 2: Dashboard" { card { ... } }
  section "Step 3: Settings"  { card { ... } }
}
```

## Next Steps

- [Components](/guide/components) - Available UI components
- [Layouts](/guide/layouts) - Layout options
