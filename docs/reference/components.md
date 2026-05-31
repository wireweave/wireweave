# Components Reference

Complete reference of all Wireweave components with examples.

## Common Props

All components support the following common properties. These are inherited from the core type system and can be used on any component.

### Spacing

| Attribute | Type           | Description         |
| --------- | -------------- | ------------------- |
| p         | number         | Padding (all sides) |
| px        | number         | Horizontal padding  |
| py        | number         | Vertical padding    |
| pt        | number         | Padding top         |
| pr        | number         | Padding right       |
| pb        | number         | Padding bottom      |
| pl        | number         | Padding left        |
| m         | number         | Margin (all sides)  |
| mx        | number \| auto | Horizontal margin   |
| my        | number         | Vertical margin     |
| mt        | number         | Margin top          |
| mr        | number         | Margin right        |
| mb        | number         | Margin bottom       |
| ml        | number         | Margin left         |

Spacing values use a token scale: 0=0px, 1=4px, 2=8px, 3=12px, 4=16px, 5=20px, 6=24px, 8=32px. You can also specify explicit units (e.g., `p=16px`, `m=2rem`).

### Sizing

| Attribute | Type                                    | Description    |
| --------- | --------------------------------------- | -------------- |
| w         | number \| full \| auto \| screen \| fit | Width          |
| h         | number \| full \| auto \| screen        | Height         |
| minW      | number                                  | Minimum width  |
| maxW      | number                                  | Maximum width  |
| minH      | number                                  | Minimum height |
| maxH      | number                                  | Maximum height |

### Flex

| Attribute | Type                                                  | Description          |
| --------- | ----------------------------------------------------- | -------------------- |
| flex      | boolean \| number                                     | Flex grow            |
| direction | row \| column \| row-reverse \| column-reverse        | Flex direction       |
| justify   | start \| center \| end \| between \| around \| evenly | Main axis alignment  |
| align     | start \| center \| end \| stretch \| baseline         | Cross axis alignment |
| wrap      | boolean                                               | Allow wrapping       |
| gap       | number                                                | Gap between children |

### Position

| Attribute | Type   | Description                           |
| --------- | ------ | ------------------------------------- |
| x         | number | X position (for absolute positioning) |
| y         | number | Y position (for absolute positioning) |

### Appearance

| Attribute | Type                          | Description      |
| --------- | ----------------------------- | ---------------- |
| bg        | muted \| primary \| secondary | Background color |
| border    | boolean                       | Show border      |

---

## Interactive Props

The following components support interactive properties: `button`, `link`, `card`, `image`, `avatar`, `badge`, `icon`.

| Attribute | Type   | Description                                         |
| --------- | ------ | --------------------------------------------------- |
| navigate  | string | Navigate to another page or URL                     |
| opens     | string | Opens a modal, drawer, or overlay element by id     |
| toggles   | string | Toggles visibility or state of an element by id     |
| action    | string | Custom action identifier (e.g., "submit", "logout") |

```wireframe
button "Open Settings" opens="settings-modal"
button "Go Home" navigate="/home"
icon "menu" toggles="sidebar"
card action="select-item" { }
```

---

## Layout

Components that define page structure.

### page

Page root container. The starting point for all layouts. Multiple `page` blocks in one `.wf` file lay out side-by-side on a wireframe canvas — use `at(x, y)` for explicit placement, or omit it for horizontal auto-flow.

```wireframe
page "Dashboard" centered {
  // content
}

page "Login" at(0, 0) viewport="1280x800" { }
page "Dashboard" at(1400, 0) viewport="1280x800" { }
```

| Attribute | Type     | Description                                                                                    |
| --------- | -------- | ---------------------------------------------------------------------------------------------- |
| title     | string   | Page title                                                                                     |
| viewport  | string   | Viewport size (e.g., "1440x900")                                                               |
| device    | string   | Device preset (see below)                                                                      |
| centered  | boolean  | Center content                                                                                 |
| at        | function | Canvas placement — `at(x, y)`. Pages without `at(...)` auto-flow horizontally with a 64px gap. |
| p, px, py | number   | Padding                                                                                        |
| gap       | number   | Gap between children                                                                           |

**Device Presets:**

| Category | Preset              | Size      | Description               |
| -------- | ------------------- | --------- | ------------------------- |
| Desktop  | `desktop-sm`        | 1280×800  | Small Laptop              |
|          | `desktop`           | 1440×900  | Desktop (default)         |
|          | `desktop-lg`        | 1920×1080 | Full HD                   |
|          | `desktop-xl`        | 2560×1440 | QHD                       |
| Tablet   | `ipad`              | 1024×768  | iPad (Landscape)          |
|          | `ipad-portrait`     | 768×1024  | iPad (Portrait)           |
|          | `ipad-pro`          | 1366×1024 | iPad Pro 12.9"            |
|          | `ipad-pro-portrait` | 1024×1366 | iPad Pro 12.9" (Portrait) |
| Mobile   | `iphone-se`         | 375×667   | iPhone SE                 |
|          | `iphone14`          | 390×844   | iPhone 14                 |
|          | `iphone14-pro`      | 393×852   | iPhone 14 Pro             |
|          | `iphone14-pro-max`  | 430×932   | iPhone 14 Pro Max         |
|          | `android`           | 360×800   | Android                   |
|          | `android-lg`        | 412×915   | Android Large             |

---

### header

Page header area. Place navigation, logo, etc.

```wireframe
header border {
  row justify=between {
    title "Logo" level=3
    nav { }
  }
}
```

| Attribute | Type    | Description          |
| --------- | ------- | -------------------- |
| border    | boolean | Bottom border        |
| p, px, py | number  | Padding              |
| gap       | number  | Gap between children |
| justify   | string  | Main axis alignment  |
| align     | string  | Cross axis alignment |

---

### main

Main content area.

```wireframe
main {
  // main content
}

main scroll {
  // scrollable content
}
```

| Attribute | Type    | Description               |
| --------- | ------- | ------------------------- |
| scroll    | boolean | Enable vertical scrolling |
| p, px, py | number  | Padding                   |
| gap       | number  | Gap between children      |

---

### footer

Page footer area.

```wireframe
footer border {
  text "Copyright 2026" muted
}
```

| Attribute | Type    | Description |
| --------- | ------- | ----------- |
| border    | boolean | Top border  |

---

### sidebar

Sidebar area.

```wireframe
sidebar position=left w=240 {
  nav vertical { }
}
```

| Attribute | Type          | Description      |
| --------- | ------------- | ---------------- |
| position  | left \| right | Sidebar position |
| w         | number        | Width            |

---

### section

Section area. Groups content logically.

```wireframe
section title="Settings" expanded {
  // content
}
```

| Attribute | Type    | Description    |
| --------- | ------- | -------------- |
| title     | string  | Section title  |
| expanded  | boolean | Expanded state |

---

## Grid

Components for flex layout.

### row

Horizontal flex container.

```wireframe
row gap=4 justify=between align=center {
  button "Cancel" secondary
  button "Submit" primary
}
```

| Attribute | Type                                                  | Description          |
| --------- | ----------------------------------------------------- | -------------------- |
| gap       | number                                                | Gap between children |
| justify   | start \| center \| end \| between \| around \| evenly | Main axis alignment  |
| align     | start \| center \| end \| stretch \| baseline         | Cross axis alignment |
| wrap      | boolean                                               | Allow wrapping       |

---

### col

Vertical flex container or grid column.

```wireframe
row {
  col span=6 { }
  col span=6 { }
}

col scroll {
  // scrollable column
}
```

| Attribute      | Type    | Description               |
| -------------- | ------- | ------------------------- |
| span           | 1-12    | Grid column width         |
| sm, md, lg, xl | number  | Responsive column width   |
| scroll         | boolean | Enable vertical scrolling |
| order          | number  | Flex order                |
| gap            | number  | Gap between children      |

---

### stack

Vertical stack container. Each child takes only its content height (flex: 0 0 auto), unlike `col` which flexes to fill available space.

```wireframe
stack gap=4 {
  text "Item 1"
  text "Item 2"
  text "Item 3"
}
```

| Attribute | Type                          | Description          |
| --------- | ----------------------------- | -------------------- |
| gap       | number                        | Gap between children |
| border    | boolean                       | Show border          |
| bg        | muted \| primary \| secondary | Background           |

---

### relative

Absolute positioning overlay container. Children can use `x` and `y` attributes for precise placement.

```wireframe
relative w=300 h=200 {
  image w=full h=full
  badge "New" x=10 y=10
}
```

| Attribute | Type   | Description |
| --------- | ------ | ----------- |
| w         | number | Width       |
| h         | number | Height      |

---

## Container

Components for grouping content.

### card

Card component. Groups and displays content. Supports [Interactive Props](#interactive-props).

```wireframe
card title="Settings" shadow=md border {
  // content
}
```

| Attribute | Type                         | Description |
| --------- | ---------------------------- | ----------- |
| title     | string                       | Card title  |
| shadow    | none \| sm \| md \| lg \| xl | Shadow size |
| border    | boolean                      | Show border |
| p         | number                       | Padding     |

---

### modal

Modal dialog. Displays content over an overlay.

```wireframe
modal "Confirm Delete" id="delete-modal" {
  text "Are you sure?"
  row justify=end gap=2 {
    button "Cancel" secondary
    button "Delete" danger
  }
}
```

| Attribute | Type   | Description                                            |
| --------- | ------ | ------------------------------------------------------ |
| title     | string | Modal title                                            |
| id        | string | Unique identifier for targeting with `opens`/`toggles` |
| w, h      | number | Width, height                                          |

---

### drawer

Drawer panel. Slides in from the edge of the screen.

```wireframe
drawer "Menu" id="side-menu" position=left {
  nav vertical { }
}
```

| Attribute | Type                           | Description                                            |
| --------- | ------------------------------ | ------------------------------------------------------ |
| title     | string                         | Drawer title                                           |
| id        | string                         | Unique identifier for targeting with `opens`/`toggles` |
| position  | left \| right \| top \| bottom | Position                                               |

---

### accordion

Accordion. Collapsible content panel.

```wireframe
accordion "Advanced Settings" {
  // content
}
```

| Attribute | Type   | Description     |
| --------- | ------ | --------------- |
| title     | string | Accordion title |

---

## Text

Components for displaying text.

### text

Displays regular text.

```wireframe
text "Regular text"
text "Muted description" muted
text "Important" weight=bold size=lg
text "Large heading" size=3xl align=justify
```

| Attribute | Type                                             | Description    |
| --------- | ------------------------------------------------ | -------------- |
| size      | xs \| sm \| base \| md \| lg \| xl \| 2xl \| 3xl | Text size      |
| weight    | normal \| medium \| semibold \| bold             | Font weight    |
| align     | left \| center \| right \| justify               | Text alignment |
| muted     | boolean                                          | Muted style    |

---

### title

Title element. Displays h1~h6 headings.

```wireframe
title "Main Title" level=1
title "Subtitle" level=2
title "Section" level=3
```

| Attribute | Type   | Description    |
| --------- | ------ | -------------- |
| level     | 1-6    | Heading level  |
| size      | string | Text size      |
| align     | string | Text alignment |

---

### link

Displays a clickable hyperlink. Supports [Interactive Props](#interactive-props).

```wireframe
link "Learn more" href="/docs"
link "GitHub" href="https://github.com" external
```

| Attribute | Type    | Description             |
| --------- | ------- | ----------------------- |
| href      | string  | Link URL                |
| external  | boolean | External link (new tab) |

---

## Input

Components for user input.

### input

Input field. Accepts text, email, password, etc.

```wireframe
input "Email" inputType=email placeholder="Enter email"
input "Password" inputType=password
input "Name" required disabled
```

| Attribute   | Type                                                                | Description      |
| ----------- | ------------------------------------------------------------------- | ---------------- |
| label       | string                                                              | Label text       |
| inputType   | text \| email \| password \| number \| tel \| url \| search \| date | Input type       |
| placeholder | string                                                              | Placeholder text |
| value       | string                                                              | Default value    |
| disabled    | boolean                                                             | Disabled state   |
| required    | boolean                                                             | Required field   |
| readonly    | boolean                                                             | Read-only        |
| icon        | string                                                              | Icon             |
| size        | sm \| md \| lg                                                      | Input size       |

---

### textarea

Multi-line input field.

```wireframe
textarea "Message" placeholder="Enter your message" rows=4
textarea "Bio" value="Hello world" required
```

| Attribute   | Type    | Description      |
| ----------- | ------- | ---------------- |
| label       | string  | Label text       |
| placeholder | string  | Placeholder text |
| value       | string  | Default value    |
| rows        | number  | Number of rows   |
| disabled    | boolean | Disabled state   |
| required    | boolean | Required field   |

---

### select

Dropdown select.

```wireframe
select "Country" placeholder="Select country" options=["USA", "Canada", "UK"]
select "Status" options=["Active", "Inactive"] value="Active"
```

| Attribute   | Type    | Description      |
| ----------- | ------- | ---------------- |
| label       | string  | Label text       |
| placeholder | string  | Placeholder text |
| options     | array   | List of options  |
| value       | string  | Selected value   |
| disabled    | boolean | Disabled state   |
| required    | boolean | Required field   |

---

### checkbox

Checkbox. Selects true/false value.

```wireframe
checkbox "Remember me"
checkbox "I agree to terms" checked
```

| Attribute | Type    | Description    |
| --------- | ------- | -------------- |
| label     | string  | Label text     |
| checked   | boolean | Checked state  |
| disabled  | boolean | Disabled state |

---

### radio

Radio button. Selects one option within a group.

```wireframe
radio "Option A" name="options"
radio "Option B" name="options" checked
```

| Attribute | Type    | Description    |
| --------- | ------- | -------------- |
| label     | string  | Label text     |
| name      | string  | Group name     |
| checked   | boolean | Selected state |
| disabled  | boolean | Disabled state |

---

### switch

Toggle switch. Toggles on/off state.

```wireframe
switch "Dark mode"
switch "Notifications" checked
```

| Attribute | Type    | Description    |
| --------- | ------- | -------------- |
| label     | string  | Label text     |
| checked   | boolean | Active state   |
| disabled  | boolean | Disabled state |

---

### slider

Slider. Selects a value within a range.

```wireframe
slider "Volume" min=0 max=100 value=50
```

| Attribute | Type    | Description    |
| --------- | ------- | -------------- |
| label     | string  | Label text     |
| min       | number  | Minimum value  |
| max       | number  | Maximum value  |
| value     | number  | Current value  |
| step      | number  | Step increment |
| disabled  | boolean | Disabled state |

---

### button

Button element. Displays a clickable button. Supports [Interactive Props](#interactive-props).

```wireframe
button "Submit" primary
button "Cancel" secondary
button "Delete" danger outline
button "Loading..." primary loading
```

| Attribute | Type                       | Description             |
| --------- | -------------------------- | ----------------------- |
| primary   | boolean                    | Primary emphasis style  |
| secondary | boolean                    | Secondary style         |
| outline   | boolean                    | Outline style           |
| ghost     | boolean                    | Ghost/transparent style |
| danger    | boolean                    | Danger/delete style     |
| size      | xs \| sm \| md \| lg \| xl | Button size             |
| icon      | string                     | Icon                    |
| disabled  | boolean                    | Disabled state          |
| loading   | boolean                    | Loading state           |

---

## Display

Components for displaying visual elements.

### image

Displays an image. Supports [Interactive Props](#interactive-props).

```wireframe
image src="/photo.jpg" alt="Photo" w=200 h=150
```

| Attribute | Type   | Description      |
| --------- | ------ | ---------------- |
| src       | string | Image source URL |
| alt       | string | Alt text         |
| w         | number | Width            |
| h         | number | Height           |

---

### placeholder

Placeholder for images or content.

```wireframe
placeholder "Image" w=300 h=200
```

| Attribute | Type   | Description |
| --------- | ------ | ----------- |
| label     | string | Label text  |
| w         | number | Width       |
| h         | number | Height      |

---

### avatar

Displays a user profile image. Supports [Interactive Props](#interactive-props).

```wireframe
avatar "John Doe"
avatar "JD" size=lg src
```

| Attribute | Type                                 | Description               |
| --------- | ------------------------------------ | ------------------------- |
| name      | string                               | Name (generates initials) |
| src       | boolean                              | Show image                |
| size      | xs \| sm \| md \| lg \| xl \| number | Size                      |

---

### badge

Displays status or count as a small label. Supports [Interactive Props](#interactive-props).

```wireframe
badge "New"
badge "Active" variant=success
badge "3" variant=danger pill
badge "!" anchor=top-right
```

| Attribute | Type                                                                    | Description                          |
| --------- | ----------------------------------------------------------------------- | ------------------------------------ |
| variant   | default \| primary \| secondary \| success \| warning \| danger \| info | Style variant                        |
| pill      | boolean                                                                 | Rounded corners                      |
| icon      | string                                                                  | Icon                                 |
| size      | xs \| sm \| md \| lg                                                    | Size                                 |
| anchor    | top-left \| top-right \| bottom-left \| bottom-right \| ...             | Anchor position in overlay container |

---

### icon

Displays an icon. Supports [Interactive Props](#interactive-props).

```wireframe
icon "home"
icon "settings" size=lg muted
```

| Attribute | Type                                 | Description |
| --------- | ------------------------------------ | ----------- |
| name      | string                               | Icon name   |
| size      | xs \| sm \| md \| lg \| xl \| number | Size        |
| muted     | boolean                              | Muted style |

---

### divider

Divider element. Visually separates content.

```wireframe
divider
divider my=4
divider vertical
```

| Attribute | Type    | Description        |
| --------- | ------- | ------------------ |
| vertical  | boolean | Vertical direction |
| m, my, mx | number  | Margin             |

---

## Data

Components for displaying data.

### table

Table component. Displays data in tabular format.

**Concise syntax** (array of arrays):

```wireframe
table [["Name", "Email", "Role"], ["John", "john@example.com", "Admin"], ["Jane", "jane@example.com", "User"]]
```

**Block syntax** (columns + row):

```wireframe
table striped hover bordered {
  columns ["Name", "Email", "Role"]
  row ["John", "john@example.com", "Admin"]
  row ["Jane", "jane@example.com", "User"]
}
```

| Attribute | Type    | Description    |
| --------- | ------- | -------------- |
| columns   | array   | Column headers |
| striped   | boolean | Striped rows   |
| bordered  | boolean | Bordered style |
| hover     | boolean | Hover effect   |

---

### list

List component. Displays items as a list.

**Array syntax**:

```wireframe
list ["Apple", "Banana", "Cherry"]
list ["First", "Second", "Third"] ordered
```

**Block syntax** (supports nesting):

```wireframe
list {
  item "Fruits" {
    item "Apple"
    item "Banana"
  }
  item "Vegetables" {
    item "Carrot"
    item "Potato"
  }
}
```

| Attribute | Type    | Description   |
| --------- | ------- | ------------- |
| ordered   | boolean | Ordered list  |
| none      | boolean | No list style |
| gap       | number  | Item gap      |

---

## Feedback

Components for providing feedback to users.

### alert

Alert element. Displays a message to users.

```wireframe
alert "Operation successful" variant=success
alert "Please check your input" variant=warning
alert "An error occurred" variant=danger dismissible
```

| Attribute   | Type                                 | Description      |
| ----------- | ------------------------------------ | ---------------- |
| variant     | success \| warning \| danger \| info | Style variant    |
| dismissible | boolean                              | Can be dismissed |
| icon        | string                               | Icon             |

---

### toast

Toast notification. Displays a temporary message.

```wireframe
toast "Saved!" position=top-right variant=success
```

| Attribute | Type                                                                                | Description   |
| --------- | ----------------------------------------------------------------------------------- | ------------- |
| position  | top-left \| top-center \| top-right \| bottom-left \| bottom-center \| bottom-right | Position      |
| variant   | success \| warning \| danger \| info                                                | Style variant |

---

### progress

Progress bar. Displays progress status.

```wireframe
progress value=75
progress value=50 label="Uploading..."
progress indeterminate
```

| Attribute     | Type    | Description            |
| ------------- | ------- | ---------------------- |
| value         | number  | Progress value (0-100) |
| max           | number  | Maximum value          |
| label         | string  | Label text             |
| indeterminate | boolean | Indeterminate state    |

---

### spinner

Loading spinner. Displays loading state.

```wireframe
spinner
spinner size=lg label="Loading..."
```

| Attribute | Type                                 | Description |
| --------- | ------------------------------------ | ----------- |
| size      | xs \| sm \| md \| lg \| xl \| number | Size        |
| label     | string                               | Label text  |

---

## Overlay

Overlay UI components.

### tooltip

Tooltip element. Displays additional info on hover.

```wireframe
tooltip "Click to save" position=top {
  button "Save" primary
}
```

| Attribute | Type                           | Description     |
| --------- | ------------------------------ | --------------- |
| content   | string                         | Tooltip content |
| position  | top \| right \| bottom \| left | Position        |

---

### popover

Popover. Displays additional content on click.

```wireframe
popover title="Options" {
  // content
}
```

| Attribute | Type   | Description   |
| --------- | ------ | ------------- |
| title     | string | Popover title |

---

### dropdown

Dropdown menu. Expands menu on click.

**Array syntax**:

```wireframe
dropdown ["Edit", "Delete", "---", "Cancel"]
```

Use `"---"` to insert a divider between items.

**Block syntax** (supports icon, href, danger, disabled):

```wireframe
dropdown {
  item "Edit" icon="edit"
  item "Duplicate" icon="copy"
  divider
  item "Delete" icon="trash" danger
}
```

| Attribute | Type  | Description |
| --------- | ----- | ----------- |
| items     | array | Menu items  |

**Item attributes (block syntax):**

| Attribute | Type    | Description    |
| --------- | ------- | -------------- |
| label     | string  | Item label     |
| icon      | string  | Item icon      |
| href      | string  | Link URL       |
| danger    | boolean | Danger style   |
| disabled  | boolean | Disabled state |

---

## Navigation

Navigation components.

### nav

Navigation area. Places menu items.

**Array syntax**:

```wireframe
nav ["Home", "About", "Contact"]
```

**Block syntax** (supports groups, dividers, icons, active state):

```wireframe
nav vertical {
  group "Main" {
    item "Dashboard" icon="home" active
    item "Settings" icon="settings"
  }
  divider
  group "Tools" {
    item "Analytics" icon="chart"
    item "Reports" icon="file"
  }
}
```

| Attribute | Type    | Description              |
| --------- | ------- | ------------------------ |
| vertical  | boolean | Vertical direction       |
| gap       | number  | Item gap                 |
| items     | array   | Nav items (array syntax) |

**Item attributes (block syntax):**

| Attribute | Type    | Description    |
| --------- | ------- | -------------- |
| label     | string  | Item label     |
| icon      | string  | Item icon      |
| href      | string  | Link URL       |
| active    | boolean | Active state   |
| disabled  | boolean | Disabled state |

---

### tabs

Tab component. Switches between multiple panels.

**Array + block syntax**:

```wireframe
tabs ["General", "Security", "Notifications"] active=0 {
  tab "General" {
    text "General settings content"
  }
  tab "Security" {
    text "Security settings content"
  }
  tab "Notifications" {
    text "Notification preferences"
  }
}
```

| Attribute | Type   | Description      |
| --------- | ------ | ---------------- |
| items     | array  | Tab labels       |
| active    | number | Active tab index |

---

### breadcrumb

Breadcrumb. Displays current location as a path.

**Array syntax**:

```wireframe
breadcrumb ["Home", "Products", "Detail"]
```

| Attribute | Type  | Description                                |
| --------- | ----- | ------------------------------------------ |
| items     | array | Breadcrumb items (string or {label, href}) |

---

## Annotation

Components for documenting wireframes with numbered markers and explanatory panels.

### marker

Numbered marker overlay. Place on UI elements for reference in annotation panels.

```wireframe
marker 1
marker 2 color=blue
marker 3 anchor=top-right color=red
```

| Attribute | Type                                                                                                                         | Description                        |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| color     | blue \| red \| green \| yellow \| purple \| orange                                                                           | Marker color                       |
| anchor    | top-left \| top-center \| top-right \| center-left \| center \| center-right \| bottom-left \| bottom-center \| bottom-right | Position within relative container |

---

### annotations

Annotation panel container. Contains `item` children with detailed descriptions.

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

| Attribute | Type   | Description |
| --------- | ------ | ----------- |
| title     | string | Panel title |

---

### item

Individual annotation entry. Used as a child of `annotations` with a marker number and title.

```wireframe
item 1 "Button Description" {
  text "Detailed explanation here"
  text "Additional notes" muted
}
```
