# SoundBridge Dark Theme Color Palette

## Overview
This document outlines the official dark theme color palette for SoundBridge, extracted from the homepage design. This palette should be used consistently across all platforms (web and mobile) to maintain brand consistency.

## Primary Background Colors

### Main Background Gradient
The primary background uses a gradient that transitions through three colors:
- **Start**: `#111827` (gray-900)
- **Middle**: `#581c87` (purple-900)
- **End**: `#111827` (gray-900)

**CSS Implementation:**
```css
background: linear-gradient(to bottom right, #111827, #581c87, #111827);
```

**Tailwind Classes:**
```html
bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900
```

### Section Backgrounds
- **Card/Section Background**: `rgba(31, 41, 55, 0.8)` to `rgba(17, 24, 39, 1)` (gray-800 to gray-900)
- **Card Background with Transparency**: `rgba(255, 255, 255, 0.1)` with backdrop blur
- **Card Border**: `rgba(255, 255, 255, 0.1)`

**CSS Implementation:**
```css
background: linear-gradient(to bottom right, rgba(31, 41, 55, 0.8), rgba(17, 24, 39, 1));
border: 1px solid rgba(255, 255, 255, 0.1);
backdrop-filter: blur(16px);
```

**Tailwind Classes:**
```html
bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 backdrop-blur-lg
```

## Text Colors

### Primary Text
- **Main Text**: `#FFFFFF` (white)
- **Secondary Text**: `#D1D5DB` (gray-300)
- **Muted Text**: `#9CA3AF` (gray-400)

**Tailwind Classes:**
- `text-white` - Primary text
- `text-gray-300` - Secondary text
- `text-gray-400` - Muted text

## Accent Colors

### Primary Accent Colors
- **Red**: `#EF4444` (red-500) / `#DC2626` (red-600)
- **Pink**: `#EC4899` (pink-500)
- **Purple**: `#A855F7` (purple-500) / `#7C3AED` (purple-600)
- **Blue**: `#3B82F6` (blue-500)

**Usage Examples:**
- Icon colors: `text-red-500`, `text-pink-500`, `text-purple-500`, `text-blue-500`
- Accent backgrounds: `bg-red-600/30`, `bg-purple-600/30`

### Primary Gradient (Brand Gradient)
- **Start**: `#DC2626` (red-600)
- **End**: `#EC4899` (pink-500)

**CSS Implementation:**
```css
background: linear-gradient(to right, #DC2626, #EC4899);
```

**Tailwind Classes:**
```html
bg-gradient-to-r from-red-600 to-pink-500
```

**Hover State:**
```css
background: linear-gradient(to right, #B91C1C, #DB2777);
```

**Tailwind Classes:**
```html
hover:from-red-700 hover:to-pink-600
```

### Secondary Gradients

#### Red-Pink Gradient (CTAs)
- **Start**: `rgba(220, 38, 38, 0.2)` (red-600/20)
- **End**: `rgba(236, 72, 153, 0.2)` (pink-500/20)
- **Border**: `rgba(220, 38, 38, 0.3)` (red-500/30)

**Tailwind Classes:**
```html
bg-gradient-to-r from-red-600/20 to-pink-500/20 border border-red-500/30
```

#### Purple-Blue Gradient (Events)
- **Start**: `rgba(147, 51, 234, 0.2)` (purple-600/20)
- **End**: `rgba(59, 130, 246, 0.2)` (blue-500/20)
- **Border**: `rgba(147, 51, 234, 0.3)` (purple-500/30)

**Tailwind Classes:**
```html
bg-gradient-to-br from-purple-600/20 to-blue-500/20 border-purple-500/30
```

## Interactive Elements

### Buttons

#### Primary Button
- **Background**: Red-Pink gradient (`from-red-600 to-pink-500`)
- **Text**: White (`#FFFFFF`)
- **Hover**: Darker gradient (`from-red-700 to-pink-600`)

#### Secondary Button
- **Background**: `rgba(255, 255, 255, 0.1)` with backdrop blur
- **Text**: White (`#FFFFFF`)
- **Border**: `rgba(255, 255, 255, 0.2)`
- **Hover**: `rgba(255, 255, 255, 0.2)`

**Tailwind Classes:**
```html
bg-white/10 backdrop-blur-lg text-white border border-white/20 hover:bg-white/20
```

### Cards

#### Quick Action Cards
- **Background**: `rgba(255, 255, 255, 0.1)` with backdrop blur
- **Border**: `rgba(255, 255, 255, 0.1)`
- **Hover**: `rgba(255, 255, 255, 0.2)`

**Tailwind Classes:**
```html
bg-white/10 backdrop-blur-lg hover:bg-white/20 border-white/10
```

## Status Colors

### Warning/Coming Soon Badge
- **Background**: `rgba(234, 179, 8, 0.2)` (yellow-500/20)
- **Border**: `rgba(234, 179, 8, 0.3)` (yellow-500/30)
- **Text**: `#FCD34D` (yellow-400)

**Tailwind Classes:**
```html
bg-yellow-500/20 border border-yellow-500/30 text-yellow-400
```

## Color Reference Table

| Element | Color | Hex Code | Tailwind Class |
|--------|-------|----------|----------------|
| Background Start | Gray 900 | `#111827` | `gray-900` |
| Background Middle | Purple 900 | `#581c87` | `purple-900` |
| Background End | Gray 900 | `#111827` | `gray-900` |
| Section Background | Gray 800-900 | `#1F2937` to `#111827` | `gray-800` to `gray-900` |
| Primary Text | White | `#FFFFFF` | `text-white` |
| Secondary Text | Gray 300 | `#D1D5DB` | `text-gray-300` |
| Muted Text | Gray 400 | `#9CA3AF` | `text-gray-400` |
| Red Accent | Red 500/600 | `#EF4444` / `#DC2626` | `red-500` / `red-600` |
| Pink Accent | Pink 500 | `#EC4899` | `pink-500` |
| Purple Accent | Purple 500/600 | `#A855F7` / `#7C3AED` | `purple-500` / `purple-600` |
| Blue Accent | Blue 500 | `#3B82F6` | `blue-500` |
| Card Background | White 10% | `rgba(255, 255, 255, 0.1)` | `bg-white/10` |
| Card Border | White 10% | `rgba(255, 255, 255, 0.1)` | `border-white/10` |
| Yellow Warning | Yellow 400 | `#FCD34D` | `text-yellow-400` |

## Implementation Guidelines

### For Mobile Development

1. **Background Gradients**: Use the three-color gradient (`gray-900` → `purple-900` → `gray-900`) for main screens and backgrounds.

2. **Card Components**: Use `rgba(255, 255, 255, 0.1)` with backdrop blur for card backgrounds, with `rgba(255, 255, 255, 0.1)` borders.

3. **Text Hierarchy**: 
   - Use white (`#FFFFFF`) for primary text
   - Use gray-300 (`#D1D5DB`) for secondary text
   - Use gray-400 (`#9CA3AF`) for muted/disabled text

4. **Accent Colors**: Use the specified accent colors (red, pink, purple, blue) for icons, highlights, and interactive elements.

5. **Primary Actions**: Use the red-to-pink gradient (`#DC2626` → `#EC4899`) for primary CTAs and buttons.

6. **Secondary Actions**: Use semi-transparent white backgrounds (`rgba(255, 255, 255, 0.1)`) with backdrop blur for secondary buttons.

7. **Status Indicators**: Use yellow-400 (`#FCD34D`) for warning/coming soon badges with yellow-500/20 background.

### CSS Variables (Recommended)

For easier maintenance, consider using CSS variables:

```css
:root {
  /* Backgrounds */
  --bg-primary-start: #111827;
  --bg-primary-middle: #581c87;
  --bg-primary-end: #111827;
  --bg-card: rgba(255, 255, 255, 0.1);
  --bg-card-hover: rgba(255, 255, 255, 0.2);
  
  /* Text */
  --text-primary: #FFFFFF;
  --text-secondary: #D1D5DB;
  --text-muted: #9CA3AF;
  
  /* Accents */
  --accent-red: #DC2626;
  --accent-pink: #EC4899;
  --accent-purple: #7C3AED;
  --accent-blue: #3B82F6;
  
  /* Gradients */
  --gradient-primary: linear-gradient(to right, #DC2626, #EC4899);
  --gradient-bg: linear-gradient(to bottom right, #111827, #581c87, #111827);
  
  /* Borders */
  --border-card: rgba(255, 255, 255, 0.1);
  --border-accent: rgba(255, 255, 255, 0.2);
}
```

## Notes

- All opacity values use the `/` notation in Tailwind (e.g., `bg-white/10` = 10% opacity)
- Backdrop blur is essential for the glassmorphism effect on cards (`backdrop-blur-lg`)
- The gradient background should be applied to the main container/screen level
- Card backgrounds should use semi-transparent white with backdrop blur for depth
- Maintain consistent spacing and border radius (typically `rounded-xl` or `rounded-2xl`)

