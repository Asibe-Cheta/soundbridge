# SoundBridge UI Components

A modern glassmorphism design system built with Shadcn/ui, Framer Motion, and Tailwind CSS, specifically designed for the SoundBridge music platform.

## 🎨 Design Philosophy

SoundBridge UI maintains a unique glassmorphism aesthetic with:
- **Backdrop blur effects** for depth and modern feel
- **Transparent backgrounds** with subtle borders
- **Gradient color schemes** using primary red (#DC2626) to accent pink (#EC4899)
- **Smooth animations** powered by Framer Motion
- **Dark theme** optimized for music applications

## 🚀 Quick Start

```tsx
import { Button, Card, MusicCard, toast } from '@/src/components/ui';

// Use components with glassmorphism styling
<Button variant="primary">Get Started</Button>
<Card variant="glass">Content</Card>
toast.success('Welcome to SoundBridge!');
```

## 📦 Core Components

### Button Component

Enhanced button with multiple variants and smooth animations.

```tsx
import { Button } from '@/src/components/ui';

// Variants
<Button variant="primary">Primary</Button>
<Button variant="glass">Glass</Button>
<Button variant="gradient">Gradient</Button>
<Button variant="glassmorphism">Glassmorphism</Button>
<Button variant="neon">Neon</Button>
<Button variant="subtle">Subtle</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>
<Button size="icon"><PlayIcon /></Button>
```

**Features:**
- 8 variants including SoundBridge-specific styles
- 5 sizes including icon variants
- Framer Motion animations (hover, tap, entrance)
- Glassmorphism effects with backdrop blur

### Card Component

Versatile card component with multiple variants and enhanced animations.

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/src/components/ui';

<Card variant="glass">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

**Variants:**
- `default` - Standard card
- `glass` - Glassmorphism effect
- `glassmorphism` - Enhanced glass effect
- `elevated` - Enhanced depth and shadow
- `gradient` - Colorful gradient background
- `music` - Music-specific styling
- `creator` - Creator profile styling
- `event` - Event-specific styling

## 🎵 Specialized Components

### MusicCard

Specialized card for displaying music tracks with enhanced features.

```tsx
import { MusicCard } from '@/src/components/ui';

<MusicCard
  id="track-1"
  title="Midnight Dreams"
  artist="Luna Echo"
  duration={180}
  playCount={12500}
  coverArt="/path/to/cover.jpg"
  isLiked={false}
  isPlaying={false}
  onPlay={(id) => console.log('Playing:', id)}
  onLike={(id) => console.log('Liked:', id)}
  onShare={(id) => console.log('Shared:', id)}
  onMore={(id) => console.log('More:', id)}
/>
```

**Features:**
- Cover art display with gradient fallback
- Play button overlay with hover animations
- Waveform visualization
- Action buttons (like, share, more)
- Play count and duration display
- Smooth hover animations

### CreatorCard

Profile card for music creators and artists.

```tsx
import { CreatorCard } from '@/src/components/ui';

<CreatorCard
  id="creator-1"
  name="Luna Echo"
  username="lunaecho"
  avatar="/path/to/avatar.jpg"
  location="London, UK"
  followerCount={12500}
  trackCount={24}
  isFollowing={false}
  isVerified={true}
  onFollow={(id) => console.log('Follow:', id)}
  onClick={(id) => console.log('Click:', id)}
/>
```

**Features:**
- Avatar display with verification badge
- Follower and track count stats
- Location information
- Follow/unfollow functionality
- Hover effects and animations

### EventCard

Card for displaying music events and concerts.

```tsx
import { EventCard } from '@/src/components/ui';

<EventCard
  id="event-1"
  title="Summer Music Festival 2024"
  date="2024-07-15"
  location="Hyde Park, London"
  price={45}
  currency="GBP"
  attendeeCount={1200}
  maxAttendees={2000}
  image="/path/to/event-image.jpg"
  category="Festival"
  isFeatured={true}
  isAttending={false}
  rating={4.8}
  onRSVP={(id) => console.log('RSVP:', id)}
  onClick={(id) => console.log('Click:', id)}
/>
```

**Features:**
- Event image with gradient fallback
- Date formatting with relative time
- Price display with currency
- Attendance tracking with progress bar
- Category and rating badges
- RSVP functionality

## 🎭 Shadcn/ui Components

### Dialog

Modal dialog with glassmorphism styling.

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    <p>Dialog content</p>
  </DialogContent>
</Dialog>
```

### Sheet

Side panel with glassmorphism styling.

```tsx
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/src/components/ui';

<Sheet>
  <SheetTrigger asChild>
    <Button>Open Sheet</Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Sheet Title</SheetTitle>
    </SheetHeader>
    <p>Sheet content</p>
  </SheetContent>
</Sheet>
```

### Tabs

Tab navigation with SoundBridge styling.

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/src/components/ui';

<Tabs defaultValue="music">
  <TabsList>
    <TabsTrigger value="music">Music</TabsTrigger>
    <TabsTrigger value="events">Events</TabsTrigger>
  </TabsList>
  <TabsContent value="music">Music content</TabsContent>
  <TabsContent value="events">Events content</TabsContent>
</Tabs>
```

### DropdownMenu

Dropdown menu with glassmorphism styling.

```tsx
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/src/components/ui';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button>Actions</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Action 1</DropdownMenuItem>
    <DropdownMenuItem>Action 2</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Avatar

Avatar component with gradient fallback.

```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@/src/components/ui';

<Avatar>
  <AvatarImage src="/path/to/avatar.jpg" />
  <AvatarFallback>SB</AvatarFallback>
</Avatar>
```

## 🔔 Toast Notifications

Enhanced toast system with glassmorphism styling.

```tsx
import { toast } from '@/src/components/ui';

// Toast types
toast.success('Operation completed successfully!');
toast.error('Something went wrong!');
toast.warning('Please check your input!');
toast.info('Here is some information!');
toast.loading('Processing...');

// Add Toaster to your layout
import { Toaster } from '@/src/components/ui';
<Toaster />
```

## 🎨 Color Palette

SoundBridge uses a carefully crafted color palette:

```css
/* Primary Colors */
--primary-red: #DC2626;
--accent-pink: #EC4899;
--coral: #F97316;

/* Background Colors */
--background: #1a1a1a;
--background-secondary: #2d1b3d;

/* Glassmorphism Colors */
--card-bg: rgba(255, 255, 255, 0.05);
--border: rgba(255, 255, 255, 0.1);
```

## 🎬 Animations

All components feature smooth animations powered by Framer Motion:

- **Entrance animations** - Fade in with scale and slide effects
- **Hover animations** - Scale and lift effects
- **Tap animations** - Scale down feedback
- **Transition animations** - Smooth state changes

## 📱 Responsive Design

All components are fully responsive and optimized for:
- **Desktop** - Full feature set with hover effects
- **Tablet** - Adapted layouts and touch interactions
- **Mobile** - Touch-friendly interfaces and simplified interactions

## 🚀 Performance

- **Lazy loading** - Components load only when needed
- **Optimized animations** - Hardware-accelerated transforms
- **Minimal bundle size** - Tree-shaking friendly exports
- **Efficient re-renders** - Optimized React patterns

## 📖 Usage Examples

### Basic Layout

```tsx
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/src/components/ui';

export default function MyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary p-8">
      <Card variant="glass" className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Welcome to SoundBridge</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/60 mb-4">
            Discover amazing music and connect with creators.
          </p>
          <Button variant="primary">Get Started</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Music Grid

```tsx
import { MusicCard } from '@/src/components/ui';

export default function MusicGrid() {
  const tracks = [
    { id: '1', title: 'Midnight Dreams', artist: 'Luna Echo', duration: 180, playCount: 12500 },
    { id: '2', title: 'Electric Soul', artist: 'Neon Pulse', duration: 240, playCount: 8900 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tracks.map(track => (
        <MusicCard
          key={track.id}
          {...track}
          onPlay={(id) => console.log('Playing:', id)}
          onLike={(id) => console.log('Liked:', id)}
          onShare={(id) => console.log('Shared:', id)}
          onMore={(id) => console.log('More:', id)}
        />
      ))}
    </div>
  );
}
```

## 🛠️ Development

### Adding New Components

1. Create component in `src/components/ui/`
2. Add glassmorphism styling with backdrop blur
3. Include Framer Motion animations
4. Add to `src/components/ui/index.ts`
5. Update this documentation

### Styling Guidelines

- Use `backdrop-blur-xl` for glass effects
- Apply `bg-white/5` to `bg-white/20` for transparency
- Use `border-white/10` to `border-white/30` for borders
- Include hover states with enhanced opacity
- Add smooth transitions with `duration-200` to `duration-300`

### Animation Guidelines

- Use `motion.div` for container animations
- Apply entrance animations with `initial`, `animate`, `transition`
- Include hover animations with `whileHover`
- Add tap feedback with `whileTap`
- Use spring animations for natural feel

## 📄 License

This UI system is part of the SoundBridge project and follows the same licensing terms.

---

For more information, visit the [UI Demo Page](/ui-demo) to see all components in action!
