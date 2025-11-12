# Dark Theme Migration Plan

## Overview
This document outlines the systematic plan to migrate all pages and components to use the new official dark theme that matches the homepage design.

## Completed Steps

### ✅ Step 1: Color Palette Documentation
- Created `MOBILE_TEAM_DARK_THEME_COLOR_PALETTE.md` with complete color specifications
- Documented all colors, gradients, and implementation guidelines

### ✅ Step 2: Global CSS Updates
- Updated `apps/web/src/styles/themes.css`:
  - Added `--bg-primary-gradient` for main background gradient
  - Updated `--bg-card` from `rgba(255, 255, 255, 0.05)` to `rgba(255, 255, 255, 0.1)`
  - Updated `--text-secondary` from `#cccccc` to `#D1D5DB` (gray-300)
  - Updated `--text-muted` from `#999999` to `#9CA3AF` (gray-400)
  - Added new accent color variables (red, pink, purple, blue)
  - Added gradient variables matching homepage
  - Added warning color variables for badges
  - Updated body background to use gradient
  - Updated card styles with backdrop blur
  - **Preserved `--bg-secondary: #1a1a1a` for navbar**

- Updated `apps/web/app/globals.css`:
  - Updated `.dark` theme variables to match new palette
  - Adjusted HSL values for better consistency

## Pages and Components to Update

### Priority 1: Core Pages (High Traffic)

#### 1. `/discover` page
**File**: `apps/web/app/discover/page.tsx`
**Current Issues**:
- May use old dark theme colors
- Cards may not have backdrop blur
- Text colors may not match new palette

**Actions**:
- [ ] Update background to use `bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900`
- [ ] Update card backgrounds to `bg-white/10 backdrop-blur-lg`
- [ ] Update card borders to `border-white/10`
- [ ] Update text colors: `text-white`, `text-gray-300`, `text-gray-400`
- [ ] Update accent colors to match homepage (red-500, pink-500, purple-500, blue-500)

#### 2. `/profile` page
**File**: `apps/web/app/profile/page.tsx`
**Actions**:
- [ ] Update background gradient
- [ ] Update card styling
- [ ] Update text colors
- [ ] Update accent colors

#### 3. `/upload` page
**File**: `apps/web/app/upload/page.tsx`
**Actions**:
- [ ] Update background gradient
- [ ] Update form inputs to match new card style
- [ ] Update button styles
- [ ] Update text colors

#### 4. `/creator/[username]` page
**File**: `apps/web/app/creator/[username]/page.tsx`
**Actions**:
- [ ] Update background gradient
- [ ] Update profile card styling
- [ ] Update track cards
- [ ] Update text colors

### Priority 2: Feature Pages

#### 5. `/events` pages
**Files**: 
- `apps/web/app/events/page.tsx`
- `apps/web/app/events/[id]/page.tsx`
**Actions**:
- [ ] Update background gradient
- [ ] Update event cards
- [ ] Update CTA buttons
- [ ] Use purple-blue gradient for event-related elements

#### 6. `/messages` page
**File**: `apps/web/app/messages/page.tsx`
**Actions**:
- [ ] Update background gradient
- [ ] Update message bubbles
- [ ] Update input fields
- [ ] Update text colors

#### 7. `/settings` page
**File**: `apps/web/app/settings/page.tsx`
**Actions**:
- [ ] Update background gradient
- [ ] Update form elements
- [ ] Update card styling
- [ ] Update text colors

### Priority 3: Components

#### 8. HeroSection Component
**File**: `apps/web/src/components/sections/HeroSection.tsx`
**Status**: ✅ Already updated (matches homepage)

#### 9. Footer Component
**File**: `apps/web/src/components/layout/Footer.tsx`
**Actions**:
- [ ] Update background to match new theme
- [ ] Update text colors
- [ ] Update link colors

#### 10. Card Components
**Files**:
- `apps/web/src/components/cards/*.tsx`
**Actions**:
- [ ] Update all card backgrounds to `bg-white/10 backdrop-blur-lg`
- [ ] Update borders to `border-white/10`
- [ ] Update hover states to `hover:bg-white/20`
- [ ] Update text colors

#### 11. Button Components
**Files**:
- `apps/web/src/components/ui/Button.tsx`
- Other button components
**Actions**:
- [ ] Update primary buttons to use `bg-gradient-to-r from-red-600 to-pink-500`
- [ ] Update secondary buttons to use `bg-white/10 backdrop-blur-lg`
- [ ] Update hover states

#### 12. Form Components
**Files**:
- `apps/web/src/components/forms/*.tsx`
**Actions**:
- [ ] Update input backgrounds to `bg-white/10`
- [ ] Update input borders to `border-white/10`
- [ ] Update text colors
- [ ] Update focus states

#### 13. Modal Components
**Files**:
- `apps/web/src/components/modals/*.tsx`
**Actions**:
- [ ] Update modal backgrounds
- [ ] Update backdrop blur
- [ ] Update borders
- [ ] Update text colors

#### 14. Search Components
**Files**:
- `apps/web/src/components/search/*.tsx`
**Actions**:
- [ ] Update search bar styling
- [ ] Update dropdown backgrounds
- [ ] Update text colors

### Priority 4: Utility Classes and Global Styles

#### 15. Global Utility Classes
**File**: `apps/web/app/globals.css`
**Actions**:
- [ ] Review and update any hardcoded dark theme colors
- [ ] Ensure Tailwind dark mode classes align with new palette
- [ ] Update any custom utility classes

## Implementation Guidelines

### Background Gradients
**Use this for main page backgrounds:**
```tsx
className={`min-h-screen ${
  theme === 'dark'
    ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
    : 'bg-gray-50'
}`}
```

**Or use CSS variable:**
```css
background: var(--bg-primary-gradient);
```

### Cards
**Standard card styling:**
```tsx
className={`rounded-xl p-6 ${
  theme === 'dark'
    ? 'bg-white/10 backdrop-blur-lg border border-white/10 hover:bg-white/20'
    : 'bg-white border-gray-200 shadow-sm'
}`}
```

### Text Colors
- Primary: `text-white` (dark) / `text-gray-900` (light)
- Secondary: `text-gray-300` (dark) / `text-gray-600` (light)
- Muted: `text-gray-400` (dark) / `text-gray-500` (light)

### Accent Colors
- Red: `text-red-500` or `text-red-600`
- Pink: `text-pink-500`
- Purple: `text-purple-500` or `text-purple-600`
- Blue: `text-blue-500`

### Buttons

**Primary Button:**
```tsx
className="bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-all font-semibold"
```

**Secondary Button:**
```tsx
className={`rounded-lg transition-all font-semibold border ${
  theme === 'dark'
    ? 'bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 border-white/20'
    : 'bg-white text-gray-900 hover:bg-gray-50 border-gray-200'
}`}
```

### Borders
- Card borders: `border-white/10` (dark) / `border-gray-200` (light)
- Accent borders: `border-white/20` (dark) / `border-gray-300` (light)

## Testing Checklist

For each page/component updated:

- [ ] Dark theme displays correctly with new gradient background
- [ ] Cards have backdrop blur effect
- [ ] Text is readable (white/gray-300/gray-400)
- [ ] Buttons use correct gradients
- [ ] Hover states work correctly
- [ ] Light theme still works correctly
- [ ] Navbar remains unchanged (still uses `#1a1a1a`)
- [ ] No visual regressions
- [ ] Responsive design still works

## Migration Order

1. **Week 1**: Core pages (discover, profile, upload, creator)
2. **Week 2**: Feature pages (events, messages, settings)
3. **Week 3**: Components (cards, buttons, forms, modals)
4. **Week 4**: Final polish and testing

## Notes

- **Navbar**: The navbar uses `var(--bg-secondary)` which remains `#1a1a1a` - DO NOT CHANGE
- **Backdrop Blur**: Essential for glassmorphism effect on cards
- **Gradients**: Use Tailwind gradient utilities for consistency
- **Opacity**: Use Tailwind opacity syntax (`/10`, `/20`, etc.)
- **Theme Toggle**: Ensure theme toggle still works correctly after updates

## Rollback Plan

If issues arise:
1. Revert changes to `themes.css` and `globals.css`
2. Keep homepage changes (it's the reference design)
3. Re-apply changes incrementally

## Success Criteria

- ✅ All pages use consistent dark theme matching homepage
- ✅ Navbar styling remains unchanged
- ✅ Light theme still works correctly
- ✅ No visual regressions
- ✅ Performance not impacted
- ✅ Mobile responsiveness maintained

