# Annotations

Wireweave supports annotation components for documenting wireframes with numbered markers and explanatory panels.

## Overview

Annotation components allow you to:

- Add numbered markers to UI elements
- Create documentation panels with detailed descriptions
- Connect markers to their explanations for clear communication

## Components

### marker

Number markers placed on UI elements for reference.

```wireframe
marker 1
marker 2 color=blue
marker 3 anchor=top-right color=red
```

**Attributes:**

- `color` - Marker color: blue, red, green, yellow, purple, orange
- `anchor` - Position within relative container: top-left, top-center, top-right, center-left, center, center-right, bottom-left, bottom-center, bottom-right

### annotations

Documentation panel containing annotation items.

```wireframe
annotations title="Screen Description" {
  item 1 "Login Button" {
    text "OAuth integration planned"
  }
  item 2 "Password Field" {
    text "Minimum 8 characters required"
  }
}
```

**Attributes:**

- `title` - Panel title (string)

### item

Individual annotation entry with marker number and title.

```wireframe
item 1 "Button Description" {
  text "Detailed explanation here"
  text "Additional notes" muted
}
```

## Usage with relative

Use `relative` container with `anchor` attribute for precise marker positioning.

```wireframe
page width=600 height=400 {
  row gap=6 {
    col span=8 {
      card p=4 {
        title "Login" level=2

        relative {
          input "Email" inputType=email
          marker 1 anchor=top-right
        }

        relative {
          input "Password" inputType=password
          marker 2 anchor=top-right
        }

        relative {
          button "Sign In" primary w=full
          marker 3 anchor=center-right
        }
      }
    }

    col span=4 {
      annotations title="Field Descriptions" {
        item 1 "Email Input" {
          text "User's email address"
          text "Required for login" muted
        }
        item 2 "Password Input" {
          text "Must be 8+ characters"
        }
        item 3 "Submit Button" {
          text "Validates and logs in user"
        }
      }
    }
  }
}
```

## Color Options

Markers support 6 color variants:

```wireframe
row gap=2 {
  marker 1 color=blue
  marker 2 color=red
  marker 3 color=green
  marker 4 color=yellow
  marker 5 color=purple
  marker 6 color=orange
}
```

## Anchor Positions

When using markers inside a `relative` container, use the `anchor` attribute to control placement:

| Anchor          | Position            |
| --------------- | ------------------- |
| `top-left`      | Top left corner     |
| `top-center`    | Top center          |
| `top-right`     | Top right corner    |
| `center-left`   | Middle left         |
| `center`        | Center              |
| `center-right`  | Middle right        |
| `bottom-left`   | Bottom left corner  |
| `bottom-center` | Bottom center       |
| `bottom-right`  | Bottom right corner |

## Best Practices

1. **Sequential numbering**: Use markers in sequence (1, 2, 3...) for clarity
2. **Consistent colors**: Use the same color for related items, different colors for different sections
3. **Clear titles**: Keep annotation item titles concise and descriptive
4. **Detailed descriptions**: Use the item body for detailed explanations
5. **Side-by-side layout**: Place the wireframe and annotation panel side by side using `row` and `col`

## Complete Example

A login form with full annotations:

```wireframe
page "Login Screen Documentation" width=900 height=600 {
  row gap=6 p=4 {
    col span=7 {
      card p=6 shadow=md {
        relative {
          title "Welcome Back" level=2 mb=4
          marker 1 anchor=top-right color=blue
        }

        col gap=4 {
          relative {
            input "Email" inputType=email placeholder="user@example.com"
            marker 2 anchor=top-right color=green
          }

          relative {
            input "Password" inputType=password
            marker 3 anchor=top-right color=green
          }

          relative {
            row justify=between align=center {
              checkbox "Remember me"
              link "Forgot password?"
            }
            marker 4 anchor=top-right color=yellow
          }

          relative {
            button "Sign In" primary w=full
            marker 5 anchor=center-right color=red
          }
        }
      }
    }

    col span=5 {
      annotations title="Implementation Notes" {
        item 1 "Page Title" {
          text "Brand message for returning users"
        }
        item 2 "Email Field" {
          text "Required"
          text "Validate email format on blur"
        }
        item 3 "Password Field" {
          text "Required"
          text "Min 8 chars, show/hide toggle planned"
        }
        item 4 "Options Row" {
          text "Remember me: saves session for 30 days"
          text "Forgot password: sends reset email"
        }
        item 5 "Submit Button" {
          text "API: POST /auth/login"
          text "Shows loading state during request"
        }
      }
    }
  }
}
```

## Next Steps

- [Components Guide](/guide/components) - All component categories
- [Layouts Guide](/guide/layouts) - Layout options including stack and relative
- [Styling Guide](/guide/styling) - Styling options
