# Tailwind CSS Technical Guidelines

## 1. Project Setup & Configuration

### 1.1 Essential Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx,html}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      // Project-specific extensions only
    },
  },
  plugins: [],
}
```

### 1.2 Recommended Plugins
- **@tailwindcss/typography** - For prose content
- **@tailwindcss/forms** - For form styling consistency
- **@tailwindcss/container-queries** - For container-based responsive design

### 1.3 Development Tools
- **Tailwind CSS IntelliSense** (VS Code extension) - REQUIRED
- **Prettier plugin for Tailwind** - Automatically sorts classes
- **ESLint plugin** - Enforces best practices

## 2. Class Organization Standards

### 2.1 Class Ordering Convention
Follow this consistent order for utility classes:

```html
<!-- Order: Layout → Positioning → Box Model → Typography → Visual → State -->
<div class="
  flex flex-col             /* Layout */
  absolute top-0 left-0      /* Positioning */
  w-full max-w-4xl p-4 m-2   /* Box Model */
  text-lg font-bold          /* Typography */
  bg-white text-gray-900     /* Visual */
  hover:bg-gray-50           /* State */
">
```

### 2.2 Line Breaking for Readability
For elements with many classes, break into logical groups:

```html
<!--  Good: Logical grouping -->
<button class="
  inline-flex items-center justify-center
  px-4 py-2
  text-sm font-medium
  text-white bg-blue-600 rounded-lg
  hover:bg-blue-700 focus:outline-none focus:ring-2
  disabled:opacity-50 disabled:cursor-not-allowed
">

<!--  Bad: Single long line -->
<button class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed">
```

## 3. Component Patterns

### 3.1 Extracting Components
When patterns repeat 3+ times, extract them:

```css
/*  Good: Extract repeated patterns */
@layer components {
  .btn-primary {
    @apply px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2;
  }

  .card {
    @apply p-6 bg-white rounded-lg shadow-md;
  }
}
```

### 3.2 Component Class Naming
- Use semantic, descriptive names
- Prefix with component type: `btn-`, `card-`, `input-`
- Keep specificity low

```css
/*  Good */
.btn-primary { }
.card-header { }
.input-error { }

/*  Bad */
.blue-button { }
.myCard { }
.error { }
```

## 4. Responsive Design Standards

### 4.1 Mobile-First Approach
Always start with mobile styles, then add larger breakpoints:

```html
<!--  Good: Mobile-first -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

<!--  Bad: Desktop-first -->
<div class="grid grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
```

### 4.2 Breakpoint Usage
- **sm:** 640px - Tablets
- **md:** 768px - Small laptops
- **lg:** 1024px - Desktops
- **xl:** 1280px - Large screens
- **2xl:** 1536px - Extra large screens

Only use breakpoints when layout actually needs to change.

## 5. Custom Styles Guidelines

### 5.1 When to Use Arbitrary Values
Use sparingly and only when necessary:

```html
<!--  Good: Use for specific, one-off needs -->
<div class="top-[117px]"> <!-- Specific positioning requirement -->

<!--  Bad: Use standard utilities when available -->
<div class="w-[50%]"> <!-- Use w-1/2 instead -->
```

### 5.2 Custom CSS Integration
For complex animations or unsupported properties:

```css
/* styles.css */
@layer utilities {
  .animation-slide-up {
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from { transform: translateY(10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
}
```

## 6. State Management

### 6.1 Interactive States
Always include interactive states for better UX:

```html
<!-- Complete interactive states -->
<button class="
  bg-blue-600 text-white
  hover:bg-blue-700
  focus:outline-none focus:ring-2 focus:ring-blue-500
  active:bg-blue-800
  disabled:opacity-50 disabled:cursor-not-allowed
">
```

### 6.2 Dark Mode Support
Implement dark mode using Tailwind's dark variant:

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

## 7. Performance Best Practices

### 7.1 PurgeCSS Configuration
Ensure all dynamic classes are included:

```javascript
// tailwind.config.js
module.exports = {
  content: [
    // Include all template files
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  safelist: [
    // Dynamically generated classes
    'bg-red-500',
    'bg-green-500',
    { pattern: /^(bg|text)-(red|green|blue)-(100|500|900)$/ }
  ]
}
```

### 7.2 Avoid Dynamic Class Names
```javascript
//  Bad: PurgeCSS can't detect this
const getButtonClass = (color) => `bg-${color}-500`

//  Good: Use complete class names
const getButtonClass = (color) => {
  const colors = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500'
  }
  return colors[color]
}
```

## 8. Accessibility Standards

### 8.1 Focus Indicators
Always provide clear focus indicators:

```html
<button class="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
```

### 8.2 Screen Reader Utilities
```html
<!-- Visually hidden but screen-reader accessible -->
<span class="sr-only">Loading...</span>

<!-- Skip to main content link -->
<a href="#main" class="sr-only focus:not-sr-only">Skip to main content</a>
```

## 9. Common Patterns

### 9.1 Container Pattern
```html
<div class="container mx-auto px-4 sm:px-6 lg:px-8">
  <!-- Content -->
</div>
```

### 9.2 Card Component
```html
<div class="bg-white rounded-lg shadow-md overflow-hidden">
  <div class="p-6">
    <h3 class="text-lg font-semibold text-gray-900">Title</h3>
    <p class="mt-2 text-gray-600">Content</p>
  </div>
</div>
```

### 9.3 Form Input
```html
<input
  type="text"
  class="
    w-full px-3 py-2
    border border-gray-300 rounded-md
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-100 disabled:cursor-not-allowed
  "
/>
```

## 10. Code Review Checklist

### Before Committing
- [ ] Classes are ordered consistently
- [ ] No unnecessary arbitrary values
- [ ] Responsive utilities use mobile-first approach
- [ ] Interactive states are defined (hover, focus, active, disabled)
- [ ] Dark mode is considered where applicable
- [ ] Repeated patterns are extracted to components
- [ ] No dynamic class name construction
- [ ] Accessibility utilities are used appropriately
- [ ] Custom CSS is in appropriate @layer
- [ ] Classes are formatted with Prettier

### Red Flags to Avoid
-  Inline styles when Tailwind utilities exist
-  !important overrides
-  Deeply nested arbitrary values
-  Mixing Tailwind with other CSS frameworks
-  Using @apply for single utilities
-  Dynamic class string concatenation

## 11. Team Conventions

### 11.1 Project-Specific Extensions
Document all custom utilities and components:

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      // Document brand colors
      'brand-primary': '#1E40AF',
      'brand-secondary': '#DB2777',
    },
    spacing: {
      // Document custom spacing
      '18': '4.5rem',
    }
  }
}
```

### 11.2 Component Library
Maintain a shared component library with documented patterns:
- Button variants
- Form components
- Layout components
- Navigation patterns

## 12. Migration Guidelines

### When Refactoring Existing CSS
1. Start with layout utilities (flex, grid)
2. Replace spacing (margin, padding)
3. Convert typography styles
4. Update colors and backgrounds
5. Add interactive states
6. Remove old CSS file references

### Gradual Adoption Strategy
- New components: Use Tailwind exclusively
- Existing components: Refactor during feature updates
- Critical paths: Maintain stability, refactor carefully
- Document mixed-approach areas

---

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Tailwind UI Patterns](https://tailwindui.com/components)
- [Headless UI](https://headlessui.com/) - Unstyled accessible components
- [Heroicons](https://heroicons.com/) - Official icon library
- [Tailwind Play](https://play.tailwindcss.com/) - Online playground

## Version
This document applies to Tailwind CSS v3.x
Last updated: [Project Start Date]
Maintainer: [Team/Person Name]
