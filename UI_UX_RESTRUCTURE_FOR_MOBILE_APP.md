# Cursor AI Prompt: UI/UX Restructure - Professional Networking Focus

---

# Feature Request: Restructure SoundBridge UI for Professional Networking Identity

## Overview
Restructure the SoundBridge mobile and web app UI to emphasize professional networking (LinkedIn-style) rather than music streaming consumption. The goal is to make SoundBridge feel like "LinkedIn for audio creators" from the first interaction, while still maintaining music discovery and streaming capabilities as secondary features.

---

## CRITICAL CONTEXT

### Current State
- Home page currently shows: Featured creators, creator earning cards, value prop cards, live audio sessions banner, trending music, hot creators, events
- Bottom navigation: Home | Discover | Upload | Messages | Profile
- Bell icon (notifications) in top right
- Purple/pink gradient brand identity
- Glassmorphism design aesthetic

### Target State
- Home page should show: Professional feed with posts, updates, opportunities, achievements from network
- Discover page remains for music/artist browsing (separate from Home)
- Professional networking prioritized over music consumption
- Upload functionality preserved in navigation

---

## NAVIGATION CHANGES

### Bottom Navigation Bar - Restructure

**Current Navigation:**
- Home
- Discover  
- Upload
- Messages
- Profile

**NEW Navigation (Implement This):**
- **Feed** (replaces "Home" label, keep home icon)
- **Discover** (keep as-is)
- **Upload** (KEEP IN CENTER - unchanged functionality)
- **Network** (new tab, replaces Messages position)
- **Profile** (keep as-is)

**CRITICAL: Upload Button Stays in Navigation**
- The "Upload" button remains in the center position of bottom navigation
- Keep existing Upload icon (+ or upload icon)
- Maintain existing upload music functionality (no changes)
- Upload = music/audio content upload (existing flow)
- Post creation = separate feature accessed via Feed page (see below)

**Implementation Notes:**
- Use existing bottom navigation component
- Change "Home" label to "Feed" 
- "Upload" stays exactly as-is in center position
- Add new "Network" tab with icon showing two people/connection icon (replaces Messages in navigation bar)
- Keep same icon style and spacing
- Active tab should highlight in red/pink as currently

**Messages Icon - Relocate:**
- MOVE Messages icon from bottom navigation to top right of screen (header area)
- Remove bell notification icon from top right
- Replace bell icon with Messages icon (speech bubble with tail)
- Messages icon should show unread count badge if applicable
- Should be visible across all main screens (Feed, Discover, Upload, Network, Profile)
- Position: Top right corner, next to any existing header elements (search, settings, etc.)
- Opens Messages/DM page when tapped

---

## HOME PAGE RESTRUCTURE (Now Called "FEED")

### Purpose
Transform home page from "featured content discovery" to "professional network activity feed" similar to LinkedIn's home page.

### Page Label
- Navigation tab label: "Feed" (not "Home")
- Use home icon (house icon) for familiarity
- Page title (if shown in header): "Feed" or "Your Network"

### Top Section - Create Post Component

**Location:** Very top of Feed page, above all other content

**Component Structure:**
- Horizontal card/box with rounded corners
- User's profile picture (small, circular) on left
- Text input placeholder: "Share an update, opportunity, or achievement..."
- Input should be tappable/clickable
- When tapped, opens post creation modal (detailed below)
- Use existing glassmorphism/card styling
- Prominent but not overwhelming

**Visual Style:**
- Background: Dark semi-transparent card (matching existing cards)
- Border: Subtle gradient border (pink/purple)
- Height: ~60-80px
- Padding: 12-16px
- Profile pic size: 40-48px diameter

**Important Distinction:**
- This "Create Post" component is for professional text/image/audio posts (updates, opportunities, achievements)
- This is NOT for uploading music tracks (that's the Upload button in navigation)
- Think: LinkedIn-style status updates vs SoundCloud-style track uploads

---

### Feed Content Structure

**Content Order (Scrollable Feed):**

1. **Create Post Card** (always at top, sticky or first item)

2. **Live Audio Sessions Banner** (relocate from current position)
   - KEEP existing "Live Audio Sessions" banner card
   - Move to appear SECOND in feed (immediately after Create Post card)
   - Maintain existing design and functionality
   - Text: "Join live rooms • Host your own • Connect in real-time"
   - "Explore Live Rooms" button remains
   - This should be a persistent element (always visible in this position)

3. **Professional Feed Posts** (new content, main feed)
   - Display posts from user's connections
   - Display posts from nearby professionals
   - Display recommended opportunities
   - Intersperse with suggestions and recommendations
   - Infinite scroll, load 10-15 posts initially, load more on scroll

4. **Interspersed Recommendations** (between posts)
   - "People You May Know" cards (every 5-7 posts)
   - Event recommendations based on location
   - Service provider suggestions
   - Opportunity highlights

**Remove from Home/Feed:**
- "Creators Earn Here" card (move to Profile or dedicated earning page)
- "Featured Creator" large promotional cards (move to Discover page)
- "Why Artists Choose SoundBridge" modal (move to onboarding or settings)
- "Trending in Your Genres" section (move to Discover page)
- "Hot Creators" with tip buttons (move to Discover page)
- Direct music playback cards (move to Discover page)

---

### Feed Post Component Design

**Individual Post Structure:**

**Header:**
- Author profile picture (circular, ~48px)
- Author name (bold, clickable to profile)
- Author role/title (e.g., "Gospel Singer", "Music Producer", "Venue Owner")
- Post timestamp (e.g., "2h ago", "Yesterday", "Nov 15")
- Three-dot menu (top right of post) - options: Report, Hide, etc.

**Content Area:**
- Post text (max 500 characters, expandable if longer with "...See more")
- Single image if attached (full-width, rounded corners, clickable to expand)
- Audio preview player if attached (custom player with play/pause, progress bar)
- Event card if post linked to event (show event details, date, location, RSVP button)

**Engagement Section:**
- Reaction buttons (icons): 👍 Support | 🎵 Love | 🔥 Fire | 👏 Congrats
- Show total reaction count (aggregate)
- Highlight user's reaction if they reacted
- Comment count (e.g., "12 comments") - clickable to expand
- Share button (opens share modal)

**Comments Section (Initially Collapsed):**
- Show "View X comments" button if comments exist
- When expanded:
  - Display most recent 3 comments
  - Each comment shows: commenter pic, name, text, timestamp, like button
  - "Load more comments" if >3 exist
  - Comment input box at top of expanded section
- Support 1 level of threading (replies to comments)

**Visual Styling:**
- Each post in a card with dark semi-transparent background
- Rounded corners (12-16px radius)
- Margin between posts (16px vertical)
- Padding inside post card (16px)
- Use existing color scheme (purple/pink accents)

---

### Feed Post Types (Examples)

**Post Type 1: Text + Image**
```
[Profile Pic] Sarah Johnson • Gospel Singer
Posted 2 hours ago                           [...]

Just wrapped recording my debut EP! 🎵
Looking for a bass player for upcoming 
live shows in London. DM if interested!

[Album Cover Image]

👍 45  🎵 12  🔥 8  💬 5 comments  ↗️ Share
```

**Post Type 2: Opportunity Post**
```
[Profile Pic] The Jazz Lounge • Venue
Posted 5 hours ago                           [...]

Seeking acoustic artists for December 
lineup. 150-capacity venue, professional 
sound, revenue split 70/30.

📍 Manchester, UK
📅 Dec 10-15, 2025

[Venue Photo]

👍 78  💬 34 comments  ↗️ Share
```

**Post Type 3: Achievement Post**
```
[Profile Pic] Marcus Williams • Producer
Posted 1 day ago                             [...]

Excited to announce I completed 
production on 3 tracks for rising artist 
@JohnDoe! Release coming soon.

Services available for Q1 2026 projects.

[Studio Setup Photo]

👍 120  🔥 45  💬 23 comments  ↗️ Share
```

**Post Type 4: Collaboration Request**
```
[Profile Pic] DJ Temitope • DJ/Producer
Posted 3 hours ago                           [...]

Working on an Afrobeat x Gospel fusion 
project. Need:
- Drummer (London-based)
- Vocalist with range
Paid session, recording Jan 2026

💬 67 comments  ↗️ Share
```

**Post Type 5: Event Announcement**
```
[Profile Pic] Sarah Johnson • Gospel Singer
Posted 1 day ago                             [...]

My first live performance! Would love 
to see you there 🎤

[Event Card]
📅 Gospel Night Live
    Dec 15, 2025 • 7:00 PM
📍 St. Mary's Church, London
🎟️ [RSVP Button]

👍 156  🔥 32  💬 45 comments  ↗️ Share
```

---

### Post Creation Modal

**Triggered When:** User taps "Share an update..." input on Feed page

**Modal Design:**

**Header:**
- "Create Post" title (centered or left-aligned)
- X close button (top right)
- Profile picture (small, top left)

**Content Area:**
- Large text input area: "What do you want to share?" placeholder
- Character counter (bottom right of text area): "X/500"
- Media attachment options (bottom of text area):
  - 📷 Photo icon - attach single image
  - 🎵 Audio icon - attach audio clip (max 60 seconds)
  - 📅 Event icon - link to existing event
  - 🏷️ Tag icon - add tags/categories

**Visibility Toggle:**
- Dropdown or toggle: "Connections Only" vs "Public"
- Default: "Connections Only"
- Icon showing current visibility state

**Bottom Actions:**
- "Cancel" button (left, secondary style)
- "Post" button (right, primary style, disabled until content exists)

**Validation:**
- Must have text content OR media attachment (can't post empty)
- Text max 500 characters
- Image max 5MB (JPG, PNG, WEBP)
- Audio max 10MB, max 60 seconds (MP3, WAV)

**After Posting:**
- Close modal
- Show success message/toast: "Posted successfully"
- Immediately show new post at top of feed
- Scroll feed to top to show new post

**Important Note:**
- This post creation is separate from music upload functionality
- Upload button in navigation = full music track upload (existing functionality)
- Create Post = professional updates, short audio previews, collaboration requests
- Posts are for networking/updates, Uploads are for distributing music

---

## DISCOVER PAGE CHANGES

### Purpose
Discover remains for music/artist browsing but reframed with professional networking angle

### Keep Current Structure But Modify Messaging

**Tabs (Keep Existing):**
- Music
- Artists  
- Events
- Playlists
- Services
- Venues

**Changes to Make:**

**1. Search Bar Text:**
- Current: "Search for creators, music, events..."
- NEW: "Search artists, producers, venues, services..."
- Emphasize people/professionals first

**2. Featured Content:**
- Reduce emphasis on pure music consumption
- MOVE "Featured Creator" cards HERE (from Home page)
- MOVE "Trending in Your Genres" HERE (from Home page)
- MOVE "Hot Creators" HERE (from Home page)

**3. Artists Tab Enhancement:**
- When viewing artists, show:
  - Profile cards with "Connect" button prominently
  - "Message" button next to Connect
  - Location displayed
  - Role/title displayed
  - Brief bio snippet
  - "Listen" button (secondary) to preview music
- Format like professional directory, not artist catalog

**4. Services Tab (Keep But Enhance):**
- Currently shows "No service providers available yet"
- This is great positioning - keep as-is
- When populated, show service providers as professional profiles

**5. Venues Tab (Enhance):**
- Show venues as businesses you can connect with
- "Connect" button to follow venue
- "Message" button to inquire about booking
- Show upcoming events at venue
- Show capacity, amenities, booking info

---

## NEW "NETWORK" TAB

### Purpose
Dedicated networking hub (like LinkedIn's "My Network" page)

### Page Structure

**Top Section:**
- Page title: "My Network"
- Connection count: "You have X connections"
- Search bar: "Find people to connect with..."

**Main Content Sections (Scrollable):**

**1. Invitations Section (If Any Exist):**
- Header: "Invitations (X)"
- Show pending connection requests
- Each invitation card shows:
  - Requester profile pic, name, role
  - "Accept" and "Ignore" buttons
  - Mutual connections count (if any)
- If no invitations: Don't show this section

**2. Find Professionals Section:**
- Header: "Connect with Professionals"
- Tabs/Filters:
  - All
  - Artists
  - Producers
  - Venues
  - Coaches
  - DJs
- Location filter (dropdown): "Near You" | "In [City]" | "Anywhere"
- Genre filter (dropdown): All | Gospel | Jazz | Afrobeat | etc.

- Display as grid of profile cards:
  - Profile picture (large, circular)
  - Name
  - Role/title
  - Location
  - Mutual connections count (if any): "12 mutual connections"
  - "Connect" button (primary)
  - "View Profile" link (secondary)

**3. Opportunities Section:**
- Header: "Opportunities Near You"
- Show recent posts tagged as opportunities:
  - Gig postings
  - Collaboration requests
  - Service offerings
- Each opportunity card shows:
  - Poster profile, name, role
  - Opportunity title/description (truncated)
  - Location and date (if applicable)
  - "View Details" button

**4. My Connections Section:**
- Header: "My Connections (X)"
- "View All" link (top right)
- Show grid of connected users (first 12)
- Each connection shows:
  - Profile picture
  - Name
  - Role
- Tappable to view profile
- "View All Connections" button at bottom to see full list

**5. Suggested Connections:**
- Header: "People You May Know"
- Show 5-10 suggested connections
- Algorithm based on:
  - Mutual connections
  - Location proximity
  - Genre/interest overlap
  - Similar role/profession
- Each suggestion card shows:
  - Profile picture, name, role
  - "Because you both know [Name]" or "Based on your location" reason
  - "Connect" button

**Visual Design:**
- Use existing card style with dark background
- Grid layout where appropriate (2 columns on mobile, 3-4 on tablet/web)
- Consistent padding and spacing
- Purple/pink accent colors for buttons

---

## PROFILE PAGE ENHANCEMENTS

### Add Professional Elements (LinkedIn-Style)

**Keep Current Elements:**
- Profile picture + banner
- Name, location, bio
- Music uploads section
- Events section

**ADD These New Sections:**

**1. Professional Headline (Under Name):**
- Editable text field
- Examples: "Gospel Singer & Songwriter", "Music Producer | Mixing Engineer"
- Displayed prominently under name
- Max 120 characters

**2. Connection Count (Under Headline):**
- Display: "X connections"
- Clickable to view connections list
- Shows network size

**3. About Section (Enhance Existing Bio):**
- Keep current bio
- Add subsections:
  - Skills: Vocals, Production, Mixing, etc. (tags/pills)
  - Years Active: "2015 - Present"
  - Genres: Gospel, Jazz, Afrobeat (tags/pills)
  - Instruments: Piano, Guitar, Drums (tags/pills)

**4. Experience Section (NEW):**
- List of past work/projects
- Each entry shows:
  - Project name/title
  - Role
  - Date range (or single date)
  - Description (optional)
  - Collaborators (tagged users)
- Format like LinkedIn work experience
- User can add/edit/remove entries

**5. Featured Section (NEW):**
- Pin top 3 tracks
- Pin best collaborations
- Pin upcoming events
- Displayed prominently near top of profile

**6. Activity Section:**
- Show recent posts by this user
- Show recent comments/engagements
- "See all activity" link

**7. Endorsements Section (Future Feature - Mention in Code Comments):**
- Allow connections to endorse skills
- Show endorsement counts
- Comment: "// TODO: Implement endorsements feature"

**8. Recommendations Section (Future Feature - Mention in Code Comments):**
- Text testimonials from collaborators
- Comment: "// TODO: Implement recommendations feature"

---

## TOP HEADER CHANGES (All Pages)

### Current Header
- Bell icon (notifications) top right
- Search bar
- Profile picture (some pages)

### NEW Header Layout

**Left Side:**
- Profile picture (small, circular, 32-40px) - tappable to open profile menu
- OR SoundBridge logo (on some pages)

**Center:**
- Search bar with updated placeholder text:
  - Feed page: "Search professionals, posts, opportunities..."
  - Discover page: "Search artists, music, events, venues..."
  - Network page: "Search connections..."
  - Upload page: Keep existing search if applicable
  - Profile page: Keep existing search if applicable

**Right Side:**
- **Messages icon** (speech bubble) - replaces bell icon
  - Shows unread count badge if unread messages exist
  - Opens Messages page when tapped
  - Should be prominently visible
  - Size: ~24px icon, 44x44px tappable area
- Settings/menu icon (if applicable on certain pages)

**Styling:**
- Consistent header across all main pages
- Dark background with slight transparency (glassmorphism)
- Icons should be ~24px, tappable area 44x44px minimum
- Messages badge (if unread): Red circle with white number

---

## COLOR & VISUAL CONSISTENCY

### Maintain Brand Identity
- Keep purple/pink gradient brand colors
- Keep glassmorphism card effects
- Keep dark theme aesthetic
- Maintain rounded corners (12-16px radius)
- Keep current button styles

### Professional Visual Cues
- Use icons consistently for actions:
  - 👍 Support (thumbs up outline)
  - 🎵 Love (musical note outline)
  - 🔥 Fire (flame outline)
  - 👏 Congrats (clapping hands outline)
  - 💬 Comment (speech bubble outline)
  - ↗️ Share (arrow/share icon)
  - ➕ Add/Connect (plus icon or person-plus icon)
  
- Professional badges/indicators:
  - Verified badge (checkmark icon for verified accounts)
  - Connection degree indicator (1st, 2nd, 3rd connection - like LinkedIn)
  - "Open to Collaborations" status badge (green dot or indicator)

---

## RESPONSIVE DESIGN

### Mobile (Primary)
- Single column layout for feeds and lists
- Stack elements vertically
- Touch-friendly button sizes (minimum 44x44px tap area)
- Bottom navigation fixed at bottom
- Header fixed at top

### Tablet
- Consider 2-column layouts where appropriate (Network page grid)
- More horizontal space utilization
- Larger cards with more content visible

### Web/Desktop
- Center main content with max-width (600-800px for feed)
- Utilize side columns for suggestions/recommendations
- Hover states for interactive elements
- Keyboard navigation support

---

## IMPLEMENTATION PRIORITY

### Phase 1 (Implement First - Critical)
1. Restructure bottom navigation (Feed, Discover, Upload, Network, Profile)
2. Keep Upload button in center of navigation (unchanged)
3. Move Messages icon to top right header (remove from navigation)
4. Restructure Home/Feed page with Create Post component
5. Implement professional feed with post display components
6. Relocate Live Audio Sessions banner to second position on Feed
7. Move Featured/Trending/Hot Creators content to Discover page
8. Implement basic Post Creation modal

### Phase 2 (Implement Next - Important)
9. Build out Network page with all sections
10. Enhance Profile pages with professional sections
11. Implement post engagement (reactions, comments, shares)
12. Add connection request functionality
13. Enhance Discover page with professional framing

### Phase 3 (Implement Later - Nice-to-Have)
14. Advanced feed algorithm (relevance sorting)
15. Endorsements system
16. Recommendations/testimonials system
17. Advanced search and filters

---

## CONTENT/COPY CHANGES

### Update Messaging Throughout App

**Current Language → NEW Language:**

- "Find music, events, and creators" → "Connect with music professionals"
- "Trending Now" → "What's happening in your network"
- "Hot Creators" → "Professionals you should know"
- "Featured Creator" → "Spotlight on professionals"
- "Discover creators" → "Discover professionals"
- "Follow" → "Connect" (where appropriate for professional relationships)

**Value Propositions (Update):**

- "Upload music free" → "Build your professional presence"
- "Get discovered" → "Grow your network"
- "Receive tips" → "Monetize directly from fans and clients"
- Focus on: Networking, Collaboration, Career Growth, Opportunities

---

## UPLOAD FUNCTIONALITY (Keep Unchanged)

### Important: Do NOT Modify Upload Feature

**Upload Button (Center of Navigation):**
- Keep existing upload button in center position
- Maintain existing upload icon and styling
- Preserve all current upload functionality
- Upload flow should remain exactly as-is

**Upload = Music Track Distribution:**
- Full-length tracks
- Albums/EPs
- Professional releases
- Goes to existing upload page/modal

**Post Creation = Professional Updates:**
- Status updates
- Short audio previews (30-60 sec)
- Collaboration requests
- Achievements
- Accessed via Feed page "Share an update..." card

**Clear Distinction:**
- Upload button = Distribute your music (existing feature)
- Create Post = Share updates with network (new feature)
- These are two separate, complementary features

---

## ACCESSIBILITY REQUIREMENTS

- All interactive elements must be keyboard accessible
- Use semantic HTML (proper heading hierarchy, buttons vs divs)
- Add ARIA labels for screen readers
- Ensure color contrast meets WCAG AA standards
- Focus states must be visible
- Images must have alt text
- Audio players must have accessible controls

---

## PERFORMANCE CONSIDERATIONS

- Lazy load images in feed (load as entering viewport)
- Infinite scroll with pagination (load 10-15 posts at a time)
- Optimize images (compress, use WebP where supported)
- Cache user profile data (don't refetch for every post by same user)
- Implement optimistic UI updates (show action immediately, rollback if fails)
- Use proper indexes on database queries (post_id, user_id, created_at)

---

## TECHNICAL NOTES

- Use existing component library and design system
- Follow current naming conventions and file structure
- Maintain consistency with existing code patterns
- Use Supabase for all data storage and real-time features
- Implement proper Row Level Security policies for posts, connections, etc.
- Use existing authentication system
- Test on multiple devices and screen sizes
- Consider progressive enhancement (core functionality works without JS)

---

## USER FLOWS TO TEST

1. **New user onboarding:**
   - Sign up → See Feed → Understand it's a professional network → Create first post → Make first connection

2. **Creating a post:**
   - Tap create post → Type content → Add image → Select visibility → Post → See post in feed

3. **Uploading music (existing flow):**
   - Tap Upload in navigation → Select track → Add metadata → Upload → Track appears in profile/discover

4. **Engaging with posts:**
   - Scroll feed → React to post → Comment on post → View comments → Reply to comment

5. **Making connections:**
   - Go to Network tab → Browse suggestions → Tap Connect → Connection request sent → Other user accepts → See in connections

6. **Finding opportunities:**
   - Scroll Feed → See opportunity post → Tap for details → Message poster → Discuss opportunity

7. **Discovering professionals:**
   - Go to Discover → Artists tab → Browse → Find interesting artist → View profile → Connect → Message

---

## WHAT NOT TO CHANGE

Do NOT modify:
- Upload/music posting functionality (keep exactly as-is)
- Existing audio player
- Message threading/DM system
- Event creation system
- Tip/payment system
- Authentication/login flow
- Database schema (unless adding new tables for posts/connections)

DO preserve:
- Brand colors (purple/pink)
- Glassmorphism design style
- Dark theme
- Logo and branding
- Existing animations and transitions
- Upload button position and functionality

---

## FINAL NOTES

The goal is to make SoundBridge immediately recognizable as a professional networking platform for audio creators, not another music streaming service. Every UI element should reinforce the identity: "LinkedIn for audio creators." Music discovery and streaming are important features, but they should support the core networking functionality, not overshadow it.

Users should think: "This is where I grow my music career and connect with industry professionals" NOT "This is where I listen to music."

Focus on professional activity, networking opportunities, collaboration requests, and career growth rather than passive music consumption.

**Key Distinction:**
- Upload button (navigation) = Distribute full music tracks (unchanged existing feature)
- Create Post (Feed page) = Share professional updates and network (new LinkedIn-style feature)
- These work together but serve different purposes

---

## NAVIGATION SUMMARY (Final)

**Bottom Navigation (Left to Right):**

1. **Feed** (house icon) - Professional feed, posts, updates
2. **Discover** (search/magnifying glass icon) - Browse music, artists, events, venues
3. **Upload** (+ or upload icon) - Upload full music tracks (existing feature)
4. **Network** (people/connection icon) - Connections, invitations, opportunities
5. **Profile** (person icon) - Your profile

**Top Right Header:**
- **Messages** icon (speech bubble) - Access DMs

**This structure:**
- Emphasizes networking (Feed, Network)
- Preserves music distribution (Upload, Discover)
- Keeps all existing functionality
- Adds professional networking layer

---

## QUESTIONS FOR CLARIFICATION

If any of these requirements are unclear or need more detail, please ask:
- Should posts support video? (Assume NO for now based on earlier discussion)
- Should there be a separate "Jobs/Gigs" board? (Can be Phase 3)
- Should connections require mutual acceptance? (YES, like LinkedIn)
- Should there be different connection types (follow vs connect)? (Discuss if needed)
- Should there be company pages for venues/studios/labels? (Future feature)
- How should we handle the distinction between "Upload music" and "Create post with audio preview"? (Upload = full tracks for distribution, Post = short previews for engagement)