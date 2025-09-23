# SoundBridge Monorepo

This repository contains both the web and mobile applications for SoundBridge, organized in a monorepo structure for optimal code sharing and maintenance.

## 🏗️ Project Structure

```
soundbridge/
├── apps/
│   ├── web/                 # Next.js web application
│   └── mobile/              # React Native mobile app
├── packages/
│   ├── types/               # Shared TypeScript types
│   ├── supabase/            # Shared Supabase client
│   └── shared/              # Shared utilities and business logic
├── database/                # Shared database schemas
└── docs/                    # Documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm 8+
- For mobile development: Expo CLI

### Installation

1. **Install all dependencies:**
   ```bash
   npm install
   ```

2. **Install app-specific dependencies:**
   ```bash
   npm run install:web
   npm run install:mobile
   ```

### Development

#### Web App
```bash
npm run dev:web
```
- Runs Next.js development server
- Access at: http://localhost:3000

#### Mobile App
```bash
npm run dev:mobile
```
- Starts Expo development server
- Use Expo Go app to scan QR code

### Building

#### Web App
```bash
npm run build:web
```

#### Mobile App
```bash
npm run build:mobile
```

## 📦 Shared Packages

### @soundbridge/types
Shared TypeScript type definitions for:
- Database schemas
- API interfaces
- Component props
- Business logic types

### @soundbridge/supabase
Shared Supabase client and utilities:
- Database client configuration
- Authentication helpers
- Query utilities
- Type-safe database operations

### @soundbridge/shared
Shared business logic and utilities:
- Formatting functions
- Validation logic
- Common utilities
- Business rules

## 🔄 Code Sharing Strategy

### What's Shared
- **Database types and schemas**
- **Supabase client configuration**
- **Business logic and utilities**
- **API interfaces and types**
- **Common validation rules**

### What's App-Specific
- **UI components** (React vs React Native)
- **Navigation** (Next.js router vs React Navigation)
- **Styling** (CSS/Tailwind vs StyleSheet)
- **Platform-specific features**
- **App-specific configurations**

## 🛠️ Development Workflow

### Adding New Features
1. **Define types** in `@soundbridge/types`
2. **Implement business logic** in `@soundbridge/shared`
3. **Create database operations** in `@soundbridge/supabase`
4. **Build UI** in respective app (`web` or `mobile`)

### Updating Shared Code
Changes to shared packages automatically affect both apps:
```bash
# Update types
cd packages/types
npm run build

# Update shared utilities
cd packages/shared
npm run build

# Both apps will use the updated code
```

## 📱 Mobile App Development

### Expo Setup
The mobile app uses Expo for development and deployment:
- **Development**: `expo start`
- **Android**: `expo start --android`
- **iOS**: `expo start --ios`
- **Web**: `expo start --web`

### App Store Deployment
```bash
# Build for production
npm run build:mobile

# Deploy to app stores
expo build:android  # Google Play Store
expo build:ios      # Apple App Store
```

## 🌐 Web App Deployment

The web app continues to deploy to Vercel as before:
```bash
npm run build:web
# Deploy to Vercel
```

## 🔧 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:web` | Start web development server |
| `npm run dev:mobile` | Start mobile development server |
| `npm run build:web` | Build web app for production |
| `npm run build:mobile` | Build mobile app for production |
| `npm run install:all` | Install dependencies for all apps |
| `npm run lint` | Lint all apps |
| `npm run test` | Test all apps |

## 📝 Environment Variables

Each app maintains its own environment configuration:
- **Web**: `apps/web/.env.local`
- **Mobile**: `apps/mobile/.env.local`

Shared environment variables should be documented in the root README.

## 🤝 Contributing

1. **Create feature branch** from `main`
2. **Make changes** in appropriate app/package
3. **Update shared code** if needed
4. **Test both apps** before merging
5. **Submit pull request**

## 📚 Documentation

- **Web App**: `apps/web/README.md`
- **Mobile App**: `apps/mobile/README.md`
- **Database**: `database/README.md`
- **API**: `docs/api/README.md`

---

**Next Steps:**
1. ✅ Set up monorepo structure
2. ✅ Create shared packages
3. ✅ Configure workspaces
4. 🔄 Test both applications
5. 📱 Develop mobile app features
6. 🚀 Deploy to app stores
