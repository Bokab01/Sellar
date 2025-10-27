# Sellar Monorepo - Shared Logic Implementation Plan

> **Complete strategy for sharing logic between Mobile (React Native) and Web (Next.js) versions**

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Step-by-Step Migration Plan](#3-step-by-step-migration-plan)
4. [Shared Packages](#4-shared-packages)
5. [Code Sharing Strategy](#5-code-sharing-strategy)
6. [Platform-Specific Code](#6-platform-specific-code)
7. [Development Workflow](#7-development-workflow)
8. [Build & Deployment](#8-build--deployment)
9. [Testing Strategy](#9-testing-strategy)
10. [Migration Checklist](#10-migration-checklist)

---

## 1. Architecture Overview

### 1.1 Current State
```
Sellar-mobile-app/          (React Native + Expo)
├── app/
├── components/
├── hooks/
├── lib/
├── store/
├── types/
└── utils/
```

### 1.2 Target State (Monorepo)
```
sellar/                     (Root monorepo)
├── apps/
│   ├── mobile/            (React Native + Expo)
│   └── web/               (Next.js)
│
├── packages/              (Shared packages)
│   ├── shared-ui/        (Shared components)
│   ├── shared-logic/     (Business logic)
│   ├── shared-types/     (TypeScript types)
│   └── shared-config/    (Config files)
│
├── package.json           (Root package.json)
├── turbo.json            (Turborepo config)
└── pnpm-workspace.yaml   (pnpm workspaces)
```

### 1.3 Benefits
- ✅ **Single source of truth** for business logic
- ✅ **Type safety** across platforms
- ✅ **Reduced code duplication** (60-70% code sharing)
- ✅ **Easier maintenance** (fix once, works everywhere)
- ✅ **Faster feature development**
- ✅ **Consistent behavior** across platforms

---

## 2. Monorepo Structure

### 2.1 Complete Folder Structure

```
sellar/
├── apps/
│   ├── mobile/                          # React Native app
│   │   ├── app/                         # Expo Router screens
│   │   ├── assets/
│   │   ├── components/                  # Mobile-specific components
│   │   │   ├── native/                  # Platform-specific (iOS/Android)
│   │   │   └── shared/                  # Re-exports from @sellar/shared-ui
│   │   ├── app.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                             # Next.js app
│       ├── app/                         # Next.js App Router
│       ├── components/                  # Web-specific components
│       │   ├── client/                  # Client components
│       │   ├── server/                  # Server components
│       │   └── shared/                  # Re-exports from @sellar/shared-ui
│       ├── public/
│       ├── next.config.js
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── shared-ui/                       # Shared UI components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Button/
│   │   │   │   ├── Input/
│   │   │   │   ├── Card/
│   │   │   │   └── ...
│   │   │   ├── primitives/             # Platform adapters
│   │   │   │   ├── View.tsx
│   │   │   │   ├── Text.tsx
│   │   │   │   ├── TouchableOpacity.tsx
│   │   │   │   └── Image.tsx
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared-logic/                    # Business logic & services
│   │   ├── src/
│   │   │   ├── services/               # API services
│   │   │   │   ├── auth-service.ts
│   │   │   │   ├── listing-service.ts
│   │   │   │   ├── chat-service.ts
│   │   │   │   ├── payment-service.ts
│   │   │   │   └── ...
│   │   │   ├── hooks/                  # Shared hooks
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useListings.ts
│   │   │   │   ├── useChat.ts
│   │   │   │   └── ...
│   │   │   ├── store/                  # Zustand stores
│   │   │   │   ├── auth-store.ts
│   │   │   │   ├── chat-store.ts
│   │   │   │   ├── monetization-store.ts
│   │   │   │   └── ...
│   │   │   ├── utils/                  # Utility functions
│   │   │   │   ├── validation.ts
│   │   │   │   ├── formatting.ts
│   │   │   │   ├── security.ts
│   │   │   │   └── ...
│   │   │   ├── lib/                    # Core libraries
│   │   │   │   ├── supabase/
│   │   │   │   ├── paystack/
│   │   │   │   ├── content-moderation/
│   │   │   │   └── ...
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared-types/                    # TypeScript types & interfaces
│   │   ├── src/
│   │   │   ├── database.ts             # Supabase generated types
│   │   │   ├── api.ts
│   │   │   ├── models.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared-config/                   # Shared configurations
│   │   ├── eslint/
│   │   │   ├── base.js
│   │   │   ├── react.js
│   │   │   └── next.js
│   │   ├── typescript/
│   │   │   ├── base.json
│   │   │   ├── react-native.json
│   │   │   └── nextjs.json
│   │   ├── constants/
│   │   │   ├── categories.ts
│   │   │   ├── colors.ts
│   │   │   └── config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared-assets/                   # Shared images, fonts, icons
│       ├── src/
│       │   ├── images/
│       │   ├── fonts/
│       │   └── icons/
│       └── package.json
│
├── supabase/                            # Shared Supabase config
│   ├── functions/                       # Edge functions
│   ├── migrations/                      # Database migrations
│   └── config.toml
│
├── .github/
│   └── workflows/
│       ├── mobile-build.yml
│       └── web-deploy.yml
│
├── package.json                         # Root package.json
├── turbo.json                           # Turborepo config
├── pnpm-workspace.yaml                  # pnpm workspaces
├── .gitignore
└── README.md
```

---

## 3. Step-by-Step Migration Plan

### Phase 1: Setup Monorepo (Week 1)

#### Step 1.1: Create Monorepo Structure
```bash
# 1. Rename current project (backup)
mv Sellar-mobile-app Sellar-mobile-app-backup

# 2. Create new monorepo
mkdir sellar
cd sellar

# 3. Initialize pnpm workspace
pnpm init

# 4. Create workspace config
cat > pnpm-workspace.yaml << EOF
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# 5. Create root package.json
cat > package.json << EOF
{
  "name": "sellar-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean",
    "type-check": "turbo run type-check"
  },
  "devDependencies": {
    "turbo": "^1.10.0",
    "typescript": "^5.0.0"
  }
}
EOF

# 6. Install Turborepo
pnpm install turbo --save-dev

# 7. Create turbo.json
cat > turbo.json << EOF
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
EOF
```

#### Step 1.2: Create Directory Structure
```bash
# Create all directories
mkdir -p apps/mobile
mkdir -p apps/web
mkdir -p packages/shared-ui/src
mkdir -p packages/shared-logic/src
mkdir -p packages/shared-types/src
mkdir -p packages/shared-config/src
mkdir -p packages/shared-assets/src
```

#### Step 1.3: Move Mobile App
```bash
# Copy mobile app to apps/mobile
cp -r ../Sellar-mobile-app-backup/* apps/mobile/

# Update mobile package.json name
cd apps/mobile
# Edit package.json: change name to "@sellar/mobile"
```

### Phase 2: Extract Shared Types (Week 1-2)

#### Step 2.1: Create Shared Types Package
```bash
cd packages/shared-types
pnpm init
```

**`packages/shared-types/package.json`**
```json
{
  "name": "@sellar/shared-types",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**`packages/shared-types/tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowJs": false,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### Step 2.2: Move Types
```bash
# Copy types from mobile app
cp apps/mobile/types/* packages/shared-types/src/

# Create index file
cat > packages/shared-types/src/index.ts << EOF
export * from './database'
export * from './api'
export * from './models'
EOF
```

### Phase 3: Extract Shared Logic (Week 2-3)

#### Step 3.1: Create Shared Logic Package
```bash
cd packages/shared-logic
pnpm init
```

**`packages/shared-logic/package.json`**
```json
{
  "name": "@sellar/shared-logic",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@sellar/shared-types": "workspace:*",
    "@supabase/supabase-js": "^2.38.0",
    "zustand": "^4.4.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

#### Step 3.2: Move Shared Code

**What to move:**
- ✅ All `/store` files (Zustand stores)
- ✅ Most `/hooks` files (business logic hooks)
- ✅ All `/lib` files (services, utilities)
- ✅ All `/utils` files
- ✅ Constants and configuration

```bash
# Move stores
cp -r apps/mobile/store/* packages/shared-logic/src/store/

# Move hooks (business logic only)
mkdir -p packages/shared-logic/src/hooks
cp apps/mobile/hooks/useAuth.ts packages/shared-logic/src/hooks/
cp apps/mobile/hooks/useListings.ts packages/shared-logic/src/hooks/
cp apps/mobile/hooks/useChat.ts packages/shared-logic/src/hooks/
# ... copy all non-UI hooks

# Move services
cp -r apps/mobile/lib/* packages/shared-logic/src/lib/

# Move utils
cp -r apps/mobile/utils/* packages/shared-logic/src/utils/
```

**`packages/shared-logic/src/index.ts`**
```typescript
// Stores
export * from './store/auth-store'
export * from './store/chat-store'
export * from './store/monetization-store'
export * from './store/notification-store'
export * from './store/block-store'
export * from './store/favorites-store'

// Hooks
export * from './hooks/useAuth'
export * from './hooks/useListings'
export * from './hooks/useChat'
export * from './hooks/usePayment'
export * from './hooks/useMonetization'
export * from './hooks/useBlockUser'

// Services
export * from './lib/supabase'
export * from './lib/paystack'
export * from './lib/content-moderation'
export * from './lib/analytics'

// Utils
export * from './utils/validation'
export * from './utils/formatting'
export * from './utils/security'
```

### Phase 4: Extract Shared UI (Week 3-4)

#### Step 4.1: Create Platform Primitives

**Key Concept:** Create platform-agnostic primitives that work on both RN and Web.

**`packages/shared-ui/src/primitives/View.tsx`**
```typescript
import React from 'react'

// Platform detection
const isWeb = typeof window !== 'undefined' && !window.navigator?.product?.includes('ReactNative')

// Type definitions
interface ViewProps {
  children?: React.ReactNode
  style?: any
  className?: string
  onClick?: () => void
  [key: string]: any
}

export const View: React.FC<ViewProps> = ({ children, style, className, ...props }) => {
  if (isWeb) {
    // Web implementation
    return <div style={style} className={className} {...props}>{children}</div>
  } else {
    // React Native implementation
    const { View: RNView } = require('react-native')
    return <RNView style={style} {...props}>{children}</RNView>
  }
}
```

**`packages/shared-ui/src/primitives/Text.tsx`**
```typescript
import React from 'react'

const isWeb = typeof window !== 'undefined' && !window.navigator?.product?.includes('ReactNative')

interface TextProps {
  children?: React.ReactNode
  style?: any
  className?: string
  [key: string]: any
}

export const Text: React.FC<TextProps> = ({ children, style, className, ...props }) => {
  if (isWeb) {
    return <span style={style} className={className} {...props}>{children}</span>
  } else {
    const { Text: RNText } = require('react-native')
    return <RNText style={style} {...props}>{children}</RNText>
  }
}
```

**`packages/shared-ui/src/primitives/Image.tsx`**
```typescript
import React from 'react'

const isWeb = typeof window !== 'undefined' && !window.navigator?.product?.includes('ReactNative')

interface ImageProps {
  source?: any
  src?: string
  style?: any
  alt?: string
  [key: string]: any
}

export const Image: React.FC<ImageProps> = ({ source, src, style, alt, ...props }) => {
  if (isWeb) {
    // Use Next.js Image if available, otherwise regular img
    try {
      const NextImage = require('next/image').default
      return <NextImage src={src || source?.uri} alt={alt || ''} style={style} {...props} />
    } catch {
      return <img src={src || source?.uri} alt={alt || ''} style={style} {...props} />
    }
  } else {
    const { Image: RNImage } = require('react-native')
    return <RNImage source={source || { uri: src }} style={style} {...props} />
  }
}
```

#### Step 4.2: Create Shared Components

**`packages/shared-ui/src/components/Button/Button.tsx`**
```typescript
import React from 'react'
import { View, Text } from '../../primitives'

interface ButtonProps {
  children: React.ReactNode
  onPress?: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  disabled?: boolean
  loading?: boolean
  style?: any
  className?: string
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  className,
}) => {
  const buttonStyles = {
    primary: {
      backgroundColor: '#0ea5e9',
      color: 'white',
      padding: '12px 24px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
    },
    secondary: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      padding: '12px 24px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
    },
    outline: {
      backgroundColor: 'transparent',
      color: '#0ea5e9',
      padding: '12px 24px',
      borderRadius: '8px',
      border: '1px solid #0ea5e9',
      cursor: 'pointer',
    },
  }

  return (
    <View
      style={[buttonStyles[variant], disabled && { opacity: 0.5 }, style]}
      className={className}
      onClick={disabled ? undefined : onPress}
    >
      <Text style={{ textAlign: 'center', fontWeight: '600' }}>
        {loading ? 'Loading...' : children}
      </Text>
    </View>
  )
}
```

### Phase 5: Create Web App (Week 4-5)

#### Step 5.1: Initialize Next.js App
```bash
cd apps/web
npx create-next-app@latest . --typescript --tailwind --app --use-pnpm
```

#### Step 5.2: Configure Web App

**`apps/web/package.json`**
```json
{
  "name": "@sellar/web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@sellar/shared-logic": "workspace:*",
    "@sellar/shared-types": "workspace:*",
    "@sellar/shared-ui": "workspace:*",
    "@sellar/shared-config": "workspace:*",
    "next": "14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/ssr": "^0.0.10",
    "@supabase/supabase-js": "^2.38.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0"
  }
}
```

#### Step 5.3: Use Shared Packages in Web

**`apps/web/lib/supabase/client.ts`**
```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@sellar/shared-types'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```

**`apps/web/app/listings/page.tsx`**
```typescript
'use client'

import { useListings } from '@sellar/shared-logic'
import { Button } from '@sellar/shared-ui'

export default function ListingsPage() {
  const { listings, isLoading } = useListings()

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <h1>Listings</h1>
      {listings.map((listing) => (
        <div key={listing.id}>
          <h3>{listing.title}</h3>
          <Button onPress={() => console.log('Clicked')}>
            View Details
          </Button>
        </div>
      ))}
    </div>
  )
}
```

### Phase 6: Update Mobile App (Week 5)

#### Step 6.1: Update Mobile Package.json

**`apps/mobile/package.json`**
```json
{
  "name": "@sellar/mobile",
  "version": "1.0.0",
  "dependencies": {
    "@sellar/shared-logic": "workspace:*",
    "@sellar/shared-types": "workspace:*",
    "@sellar/shared-config": "workspace:*",
    "expo": "~49.0.0",
    "react": "18.2.0",
    "react-native": "0.72.0",
    // ... other mobile dependencies
  }
}
```

#### Step 6.2: Update Imports in Mobile

**Before:**
```typescript
import { useAuthStore } from '../store/auth-store'
import { ListingService } from '../lib/listing-service'
```

**After:**
```typescript
import { useAuthStore, ListingService } from '@sellar/shared-logic'
```

### Phase 7: Testing & Validation (Week 6)

```bash
# Install dependencies
pnpm install

# Type check all packages
pnpm type-check

# Build all packages
pnpm build

# Run tests
pnpm test

# Start mobile dev
cd apps/mobile && pnpm dev

# Start web dev
cd apps/web && pnpm dev
```

---

## 4. Shared Packages

### 4.1 What to Share

| Category | Share? | Notes |
|----------|--------|-------|
| **Business Logic** | ✅ 100% | All services, hooks, utilities |
| **State Management** | ✅ 100% | Zustand stores |
| **Types** | ✅ 100% | TypeScript interfaces |
| **Validation** | ✅ 100% | Form validation, input sanitization |
| **API Clients** | ✅ 100% | Supabase, Paystack services |
| **Constants** | ✅ 100% | Categories, colors, config |
| **Utilities** | ✅ 100% | Date formatting, string utils |
| **UI Components** | ⚠️ 70% | With platform adapters |
| **Navigation** | ❌ 0% | Platform-specific |
| **Storage** | ⚠️ 50% | Adapter pattern |
| **Notifications** | ⚠️ 50% | Platform-specific implementations |

### 4.2 Shared Packages Details

#### **@sellar/shared-logic** (Most Important)
- ✅ All Zustand stores
- ✅ All hooks (except UI-specific)
- ✅ Supabase client & helpers
- ✅ Paystack integration
- ✅ Content moderation
- ✅ Analytics service
- ✅ All utilities

#### **@sellar/shared-types**
- ✅ Database types (Supabase generated)
- ✅ API types
- ✅ Model interfaces
- ✅ Enum definitions

#### **@sellar/shared-ui**
- ⚠️ Platform primitives (View, Text, Image, etc.)
- ⚠️ Basic components (Button, Input, Card)
- ⚠️ Complex components with adapters

#### **@sellar/shared-config**
- ✅ ESLint configs
- ✅ TypeScript configs
- ✅ Constants (categories, colors)
- ✅ Environment configs

---

## 5. Code Sharing Strategy

### 5.1 Import Patterns

**Mobile App:**
```typescript
// Shared logic
import { useAuthStore, useListings } from '@sellar/shared-logic'
import { ListingService } from '@sellar/shared-logic'

// Shared types
import type { Listing, User } from '@sellar/shared-types'

// Mobile-specific components
import { ProductCard } from '../components/ProductCard'
```

**Web App:**
```typescript
// Same shared logic
import { useAuthStore, useListings } from '@sellar/shared-logic'
import { ListingService } from '@sellar/shared-logic'

// Same shared types
import type { Listing, User } from '@sellar/shared-types'

// Web-specific components
import { ProductCard } from '@/components/ProductCard'
```

### 5.2 Storage Adapter Pattern

**`packages/shared-logic/src/lib/storage/adapter.ts`**
```typescript
interface StorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  clear(): Promise<void>
}

// Platform detection
const isWeb = typeof window !== 'undefined' && !window.navigator?.product?.includes('ReactNative')

// Create adapter based on platform
export const storage: StorageAdapter = isWeb
  ? {
      // Web implementation (localStorage)
      async getItem(key) {
        return localStorage.getItem(key)
      },
      async setItem(key, value) {
        localStorage.setItem(key, value)
      },
      async removeItem(key) {
        localStorage.removeItem(key)
      },
      async clear() {
        localStorage.clear()
      },
    }
  : {
      // React Native implementation (AsyncStorage)
      async getItem(key) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default
        return await AsyncStorage.getItem(key)
      },
      async setItem(key, value) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default
        await AsyncStorage.setItem(key, value)
      },
      async removeItem(key) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default
        await AsyncStorage.removeItem(key)
      },
      async clear() {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default
        await AsyncStorage.clear()
      },
    }
```

### 5.3 Supabase Client Pattern

**`packages/shared-logic/src/lib/supabase/base-client.ts`**
```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@sellar/shared-types'

// Base configuration
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
}

// Create base client (used by both platforms)
export const createBaseClient = () => {
  return createSupabaseClient<Database>(
    supabaseConfig.url,
    supabaseConfig.anonKey
  )
}
```

**Mobile-specific:**
```typescript
// apps/mobile/lib/supabase.ts
import { createBaseClient } from '@sellar/shared-logic'

export const supabase = createBaseClient()
```

**Web-specific:**
```typescript
// apps/web/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { supabaseConfig } from '@sellar/shared-logic'
import type { Database } from '@sellar/shared-types'

export const createClient = () =>
  createBrowserClient<Database>(
    supabaseConfig.url,
    supabaseConfig.anonKey
  )
```

---

## 6. Platform-Specific Code

### 6.1 Mobile-Specific (`apps/mobile`)

**Keep in mobile only:**
- ✅ Expo configuration (`app.json`, `eas.json`)
- ✅ Native UI components (using React Native)
- ✅ Navigation (Expo Router)
- ✅ Push notifications (FCM)
- ✅ Camera/Gallery access
- ✅ Location services
- ✅ Splash screens
- ✅ App icons

### 6.2 Web-Specific (`apps/web`)

**Keep in web only:**
- ✅ Next.js configuration
- ✅ Web UI components (using Tailwind/HTML)
- ✅ Navigation (Next.js App Router)
- ✅ Browser notifications API
- ✅ File upload (Web API)
- ✅ Geolocation API
- ✅ SEO components (meta tags)
- ✅ PWA configuration

---

## 7. Development Workflow

### 7.1 Daily Development

```bash
# Start everything
pnpm dev

# Or start individually
pnpm --filter @sellar/mobile dev
pnpm --filter @sellar/web dev

# Watch shared packages (auto-rebuild on change)
pnpm --filter @sellar/shared-logic dev
```

### 7.2 Making Changes

**Scenario 1: Update shared logic**
```bash
# 1. Edit shared package
code packages/shared-logic/src/services/listing-service.ts

# 2. Changes automatically reflected in both apps
# (if using watch mode)
```

**Scenario 2: Add new feature to both platforms**
```bash
# 1. Add logic to shared package
code packages/shared-logic/src/hooks/useOffers.ts

# 2. Add mobile UI
code apps/mobile/app/offers/index.tsx

# 3. Add web UI
code apps/web/app/offers/page.tsx
```

### 7.3 Version Management

**Use changesets for versioning:**
```bash
# Install changesets
pnpm add -Dw @changesets/cli
pnpm changeset init

# Create changeset when making changes
pnpm changeset

# Version packages
pnpm changeset version

# Publish (if publishing to npm)
pnpm changeset publish
```

---

## 8. Build & Deployment

### 8.1 Build Commands

**Root `package.json` scripts:**
```json
{
  "scripts": {
    "build": "turbo run build",
    "build:mobile": "pnpm --filter @sellar/mobile build",
    "build:web": "pnpm --filter @sellar/web build",
    "build:shared": "pnpm --filter '@sellar/shared-*' build",
    
    "dev": "turbo run dev --parallel",
    "dev:mobile": "pnpm --filter @sellar/mobile dev",
    "dev:web": "pnpm --filter @sellar/web dev",
    
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean && rm -rf node_modules"
  }
}
```

### 8.2 CI/CD Pipeline

**`.github/workflows/ci.yml`**
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Lint
        run: pnpm lint
      
      - name: Type check
        run: pnpm type-check
      
      - name: Test
        run: pnpm test

  build-web:
    needs: lint-and-typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build web
        run: pnpm build:web
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: web-build
          path: apps/web/.next

  build-mobile:
    needs: lint-and-typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build mobile
        run: cd apps/mobile && eas build --platform all --non-interactive
```

### 8.3 Deployment

**Web (Vercel):**
```bash
# Deploy from root
vercel --cwd apps/web

# Or configure vercel.json
```

**`apps/web/vercel.json`**
```json
{
  "buildCommand": "cd ../.. && pnpm build:web",
  "installCommand": "cd ../.. && pnpm install",
  "framework": "nextjs"
}
```

**Mobile (EAS):**
```bash
cd apps/mobile
eas build --platform all
eas submit --platform all
```

---

## 9. Testing Strategy

### 9.1 Shared Logic Tests

**`packages/shared-logic/__tests__/listing-service.test.ts`**
```typescript
import { ListingService } from '../src/services/listing-service'

describe('ListingService', () => {
  it('should fetch listings', async () => {
    const service = new ListingService()
    const listings = await service.getListings()
    expect(listings).toBeDefined()
    expect(Array.isArray(listings)).toBe(true)
  })
})
```

### 9.2 Component Tests

**Mobile:**
```typescript
import { render } from '@testing-library/react-native'
import { ProductCard } from '../ProductCard'

test('renders product card', () => {
  const { getByText } = render(
    <ProductCard listing={mockListing} />
  )
  expect(getByText('Test Product')).toBeDefined()
})
```

**Web:**
```typescript
import { render } from '@testing-library/react'
import { ProductCard } from '../ProductCard'

test('renders product card', () => {
  const { getByText } = render(
    <ProductCard listing={mockListing} />
  )
  expect(getByText('Test Product')).toBeInTheDocument()
})
```

---

## 10. Migration Checklist

### Pre-Migration
- [ ] Backup current codebase
- [ ] Document current architecture
- [ ] List all dependencies
- [ ] Identify shared vs platform-specific code

### Phase 1: Setup (Week 1)
- [ ] Create monorepo structure
- [ ] Setup pnpm workspaces
- [ ] Install Turborepo
- [ ] Create directory structure
- [ ] Move mobile app to `apps/mobile`

### Phase 2: Extract Types (Week 1-2)
- [ ] Create `@sellar/shared-types` package
- [ ] Move all TypeScript types
- [ ] Update imports in mobile app
- [ ] Test type checking

### Phase 3: Extract Logic (Week 2-3)
- [ ] Create `@sellar/shared-logic` package
- [ ] Move Zustand stores
- [ ] Move hooks (business logic)
- [ ] Move services (Supabase, Paystack, etc.)
- [ ] Move utilities
- [ ] Update imports in mobile app
- [ ] Test all functionality

### Phase 4: Extract UI (Week 3-4)
- [ ] Create `@sellar/shared-ui` package
- [ ] Create platform primitives
- [ ] Extract sharable components
- [ ] Update mobile app to use shared UI
- [ ] Test mobile app thoroughly

### Phase 5: Create Web App (Week 4-5)
- [ ] Initialize Next.js app
- [ ] Setup Supabase client
- [ ] Use shared packages
- [ ] Implement key pages
- [ ] Test web app

### Phase 6: Integration (Week 5-6)
- [ ] Test mobile app end-to-end
- [ ] Test web app end-to-end
- [ ] Test shared logic changes reflect in both
- [ ] Performance testing
- [ ] Fix any issues

### Phase 7: Deployment (Week 6)
- [ ] Setup CI/CD pipelines
- [ ] Deploy web app (Vercel)
- [ ] Build mobile app (EAS)
- [ ] Monitor both platforms

---

## 11. Best Practices

### 11.1 Package Naming
- Use `@sellar/` namespace for all packages
- Use descriptive names (`shared-logic`, not `logic`)
- Keep names consistent

### 11.2 Imports
- Always use workspace protocol: `"@sellar/shared-logic": "workspace:*"`
- Use absolute imports in apps
- Use relative imports in packages

### 11.3 Versioning
- Use `workspace:*` for internal dependencies
- Pin external dependencies
- Use changesets for version management

### 11.4 Code Organization
- Keep platform-specific code in apps
- Keep shared code in packages
- Use adapters for platform differences

### 11.5 Testing
- Test shared logic thoroughly
- Test platform-specific UI separately
- Use mocks for platform APIs

---

## 12. Troubleshooting

### Issue: Module not found
```bash
# Solution: Install dependencies
pnpm install

# Solution: Build packages
pnpm build:shared
```

### Issue: Type errors after moving types
```bash
# Solution: Update tsconfig.json paths
{
  "compilerOptions": {
    "paths": {
      "@sellar/shared-types": ["../../packages/shared-types/src"]
    }
  }
}
```

### Issue: Changes in shared package not reflecting
```bash
# Solution: Restart dev server
pnpm dev

# Or build shared packages
pnpm build:shared
```

---

## 13. Timeline Summary

| Phase | Duration | Description |
|-------|----------|-------------|
| Setup | Week 1 | Create monorepo, setup tools |
| Extract Types | Week 1-2 | Move types to shared package |
| Extract Logic | Week 2-3 | Move business logic to shared |
| Extract UI | Week 3-4 | Create shared UI components |
| Create Web | Week 4-5 | Build Next.js app |
| Integration | Week 5-6 | Test & fix both platforms |
| Deployment | Week 6 | Setup CI/CD, deploy |

**Total: 6-8 weeks**

---

## 14. Benefits Achieved

After completing this migration:

✅ **70-80% code sharing** between mobile and web
✅ **Single source of truth** for business logic
✅ **Faster feature development** (write once, works everywhere)
✅ **Easier maintenance** (fix once, fixed everywhere)
✅ **Type safety** across all platforms
✅ **Better code organization**
✅ **Improved testing** (test shared logic once)
✅ **Consistent behavior** across platforms
✅ **Reduced bundle sizes** (shared dependencies)
✅ **Better developer experience**

---

**Ready to start? Follow the step-by-step plan and you'll have a working monorepo in 6 weeks! 🚀**

