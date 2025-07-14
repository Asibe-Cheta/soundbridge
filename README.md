# SoundBridge - Creator Platform & Live Events Discovery

A modern creator platform and live events discovery app for the UK and Nigeria markets. Built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## 🚀 Features

- **Creator Profiles**: Connect with artists, producers, and musicians
- **Live Events**: Discover and book tickets for music events and festivals
- **Audio Content**: Upload and stream music, podcasts, and audio content
- **Real-time Updates**: Live notifications and real-time data synchronization
- **Mobile-First Design**: Responsive design optimized for all devices
- **Search & Discovery**: Advanced search across creators, events, and content

## 🛠 Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Real-time)
- **Audio**: Howler.js for audio playback
- **UI Components**: Radix UI primitives
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion
- **Deployment**: Vercel

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd soundbridge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

   # Google Maps API (for event locations)
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up Supabase Database**
   
   Create the following tables in your Supabase project:

   ```sql
   -- Users profiles (extends auth.users)
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users(id) PRIMARY KEY,
     username TEXT UNIQUE NOT NULL,
     display_name TEXT,
     bio TEXT,
     avatar_url TEXT,
     user_type TEXT DEFAULT 'listener',
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Audio content
   CREATE TABLE audio_content (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     creator_id UUID REFERENCES auth.users(id),
     title TEXT NOT NULL,
     description TEXT,
     file_url TEXT NOT NULL,
     duration INTEGER,
     genre TEXT,
     play_count INTEGER DEFAULT 0,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Events
   CREATE TABLE events (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     organizer_id UUID REFERENCES auth.users(id),
     title TEXT NOT NULL,
     description TEXT,
     category TEXT NOT NULL,
     venue_name TEXT,
     city TEXT,
     country TEXT,
     event_date TIMESTAMP NOT NULL,
     price_range JSONB,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎨 Design System

### Colors
- **Primary Red**: `#DC2626`
- **Accent Pink**: `#EC4899`
- **Coral**: `#F97316`
- **Background**: `#1a1a1a`
- **Background Secondary**: `#2d1b3d`

### Components
- **Glassmorphism Cards**: `backdrop-filter: blur(20px)` with subtle borders
- **Gradient Overlays**: For featured content and hero sections
- **Hover Effects**: Transform and shadow animations
- **Responsive Grids**: 6-column for music, 4-column for events, 3-column for creators

## 📁 Project Structure

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx (homepage)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── api/
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Input.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   └── sections/
│       ├── FeaturedCreators.tsx
│       ├── LiveEvents.tsx
│       └── TrendingPodcasts.tsx
├── lib/
│   ├── supabase.ts
│   ├── utils.ts
│   └── types.ts
└── styles/
```

## 🚀 Development Phases

### Phase 1: Core Foundation ✅
- [x] Project setup and environment
- [x] Header and navigation
- [x] Homepage with all sections (static)
- [x] Basic routing structure

### Phase 2: Authentication & Database
- [ ] Supabase configuration
- [ ] Login/register pages
- [ ] User profiles
- [ ] Database schema implementation

### Phase 3: Core Features
- [ ] Audio upload and playback
- [ ] Event creation and listing
- [ ] User dashboard
- [ ] Search functionality

### Phase 4: Advanced Features
- [ ] Messaging system
- [ ] Notification preferences
- [ ] Location-based discovery
- [ ] Mobile optimization

## 🎯 Key Features

### For Creators
- Upload and manage audio content
- Create and manage events
- Build a following and engage with fans
- Analytics and insights

### For Event Organizers
- Create and promote events
- Sell tickets and manage attendees
- Real-time event updates
- Location-based event discovery

### For Music Lovers
- Discover new artists and music
- Find and book event tickets
- Create playlists and follow creators
- Real-time notifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you have any questions or need help, please open an issue on GitHub or contact the development team.

---

Built with ❤️ for the music community in the UK and Nigeria.
