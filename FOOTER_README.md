# SoundBridge Footer Component

## Overview
The Footer component provides a comprehensive footer for the SoundBridge platform that matches the established glassmorphism design system.

## Features

### Design System Compliance
- **Glassmorphism Styling**: Uses `rgba(255, 255, 255, 0.05)` background with `backdrop-filter: blur(20px)`
- **Color Scheme**: Follows established colors - `#DC2626` primary, `#EC4899` accent
- **Typography**: Gradient text for section headers, proper hover effects
- **Responsive Design**: Stacks columns on mobile devices

### Footer Structure

#### Main Footer (4 Columns)
1. **Company**
   - About
   - Careers
   - Press
   - Blog

2. **Creators**
   - Upload Music (with Music icon)
   - Start Podcast (with Mic icon)
   - Create Event (with Calendar icon)
   - Creator Resources (with Users icon)

3. **Community**
   - Discover
   - Events
   - Forums
   - Guidelines

4. **Support**
   - Help Center (with HelpCircle icon)
   - Contact (with Mail icon)
   - Privacy Policy (with Shield icon)
   - Terms of Service (with FileText icon)

#### Secondary Footer
- **Copyright**: "© 2024 SoundBridge. Connecting creators across UK & Nigeria"
- **Social Media**: Instagram, Twitter, TikTok, YouTube icons
- **Legal Links**: Privacy • Terms • Cookies

### Technical Implementation

#### TypeScript Interfaces
```typescript
interface FooterLink {
  name: string;
  href: string;
  icon?: LucideIcon;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}
```

#### Styling Classes
- Main footer: `bg-card-bg backdrop-blur-xl border-t border-white/10`
- Section headers: `bg-gradient-to-r from-primary-red to-accent-pink bg-clip-text text-transparent`
- Links: `text-white/70 hover:text-white transition-colors duration-200`
- Hover effects: `hover:bg-white/5 px-2 py-1 rounded-md`

#### Responsive Behavior
- Desktop: 4-column grid layout
- Tablet: 2-column grid layout
- Mobile: Single column stack

### Usage

```tsx
import { Footer } from '../src/components/layout/Footer';

// In your component
<Footer />
```

### Integration
The Footer component is integrated into the main page layout and positioned at the bottom of the main-container with proper spacing (`mt-20`).

### Accessibility
- Proper ARIA labels for social media icons
- Semantic HTML structure
- Keyboard navigation support
- Screen reader friendly

### Dependencies
- Lucide React icons
- Next.js Link component
- Tailwind CSS for styling 