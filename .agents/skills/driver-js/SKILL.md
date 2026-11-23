---
name: driver-js
description: "Add product tours, element highlights, feature hints, and onboarding checklists to a web app with Driver.js. Use when the user wants an onboarding tour, a guided walkthrough, a spotlight/dimmer on an element, pulsing hint beacons, or a getting-started checklist in any frontend framework (React, Next.js, Vue, vanilla JS)."
---

# Driver.js

Driver.js is a lightweight, zero-dependency, vanilla JavaScript engine that works seamlessly across all frameworks (React, Next.js, Vue, Svelte, static HTML) to drive the user's focus across the page.

## Key Features

1. **Product Tours**: Multi-step guided walkthroughs with progress bars, next/back navigation, and step triggers.
2. **Action-Driven Steps**: Waits for the user to click, type, or interact before advancing; validates interactions.
3. **Element Highlights**: Dims the background and illuminates one or more target elements, with or without interactive popovers.
4. **Interactive Hints**: Pulsing beacon pins that expand on click without blocking interaction with the rest of the page.
5. **Onboarding Checklists**: Floating getting-started widget where checklist items launch specific tours and mark themselves complete upon finishing.
6. **Accessible & Themeable**: Built-in keyboard navigation (ESC, arrows), screen-reader announcements, and CSS custom properties (`--driver-*`).

---

## Installation

```bash
npm install driver.js
```

Each feature has its own entrypoint and stylesheet:
- **Tours and highlights**: `import { driver } from "driver.js"` and `import "driver.js/dist/driver.css"`
- **Hints**: `import { hints } from "driver.js/hints"` and `import "driver.js/dist/hints.css"`
- **Checklists**: `import { checklist } from "driver.js/checklist"` with `import "driver.js/dist/driver.css"` and `import "driver.js/dist/checklist.css"`
- **Headless Mode** (bring your own UI): `import { driver } from "driver.js/headless"`, no CSS needed.

---

## Common Patterns

### 1. Step-by-Step Product Tour

```javascript
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const driverObj = driver({
  showProgress: true,
  animate: true,
  steps: [
    {
      element: "#welcome-banner",
      popover: {
        title: "Xoş gəldiniz!",
        description: "Layihəyə buradan başlaya bilərsiniz.",
        side: "bottom",
        align: "start"
      }
    },
    {
      element: "#action-button",
      popover: {
        title: "Əsas Fəaliyyət",
        description: "İlk addımı atmaq üçün bu düyməyə klikləyin.",
        side: "right"
      }
    }
  ]
});

driverObj.drive();
```

### 2. Single Element Spotlight / Highlight

```javascript
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const driverObj = driver({
  overlayColor: "rgba(0, 0, 0, 0.75)",
});

driverObj.highlight({
  element: "#search-input",
  popover: {
    title: "Axtarış",
    description: "İstənilən fayl və ya məlumatı buradan axtarın."
  }
});
```

### 3. Pulsing Hints

```javascript
import { hints } from "driver.js/hints";
import "driver.js/dist/hints.css";

const hintObj = hints({
  hints: [
    {
      element: "#new-feature-badge",
      popover: {
        title: "Yeni İmkan",
        description: "Bu funksionallıq yeni əlavə edildi."
      }
    }
  ]
});

hintObj.show();
```
