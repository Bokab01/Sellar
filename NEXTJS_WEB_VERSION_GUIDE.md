# Sellar Web Version - Complete Implementation Guide for Next.js

> **Comprehensive documentation for building an exact web replica of the Sellar mobile app using Next.js**

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Project Setup](#3-project-setup)
4. [Database Schema](#4-database-schema)
5. [Authentication System](#5-authentication-system)
6. [Core Features](#6-core-features)
7. [UI Components Library](#7-ui-components-library)
8. [State Management](#8-state-management)
9. [Real-time Features](#9-real-time-features)
10. [Payment Integration](#10-payment-integration)
11. [Content Moderation](#11-content-moderation)
12. [Performance Optimization](#12-performance-optimization)
13. [Deployment](#13-deployment)

---

## 1. Project Overview

### 1.1 What is Sellar?
Sellar is a comprehensive marketplace application for Ghana that combines:
- **E-commerce marketplace** (buy/sell listings)
- **Real-time messaging system**
- **Community features** (posts, comments, social interactions)
- **Monetization** (credit system, subscriptions, feature purchases)
- **Advanced features** (offers, negotiations, reservations, analytics)

### 1.2 Key Statistics
- **Database Tables**: 40+ tables
- **API Endpoints**: 50+ Supabase Edge Functions
- **Components**: 100+ reusable React components
- **Features**: Authentication, Listings, Chat, Community, Payments, Analytics, etc.

### 1.3 Mobile App Architecture (Current)
```
React Native (Expo) + TypeScript
├── State Management: Zustand
├── Backend: Supabase (PostgreSQL + Realtime + Storage + Edge Functions)
├── Payments: Paystack (Cards + Mobile Money)
├── Real-time: Supabase Realtime (WebSockets)
├── Storage: Cloudflare R2
└── Notifications: Firebase Cloud Messaging
```

---

## 2. Tech Stack & Architecture

### 2.1 Recommended Stack for Web Version

```typescript
Next.js 14+ (App Router)
├── Frontend
│   ├── Framework: Next.js 14 (App Router with Server Components)
│   ├── Language: TypeScript 5+
│   ├── Styling: Tailwind CSS 3+ (or Chakra UI / shadcn/ui)
│   ├── State Management: Zustand (same as mobile)
│   ├── Forms: React Hook Form + Zod validation
│   ├── Icons: Lucide React (same library as mobile)
│   └── Image Optimization: Next.js Image component
│
├── Backend (Shared with Mobile)
│   ├── Database: Supabase (PostgreSQL 15+)
│   ├── Authentication: Supabase Auth
│   ├── Real-time: Supabase Realtime
│   ├── Storage: Cloudflare R2 (via Supabase Edge Functions)
│   ├── Edge Functions: Supabase Edge Functions (Deno)
│   └── File Upload: Supabase Storage + R2
│
├── Payments
│   ├── Provider: Paystack API
│   ├── Methods: Cards, Mobile Money (MTN, Vodafone, AirtelTigo)
│   └── Webhooks: Supabase Edge Functions
│
├── Real-time Features
│   ├── Chat: Supabase Realtime (postgres_changes)
│   ├── Typing Indicators: Supabase Broadcast API
│   ├── Notifications: Supabase Realtime + Browser Notifications API
│   └── Live Updates: SWR or React Query for data fetching
│
└── Deployment
    ├── Hosting: Vercel (recommended) or Netlify
    ├── CDN: Cloudflare (for R2 assets)
    ├── Database: Supabase (hosted PostgreSQL)
    └── Edge Functions: Supabase Edge Functions
```

### 2.2 Project Structure

```
sellar-web/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes (grouped)
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── (main)/                   # Main authenticated routes
│   │   ├── dashboard/            # User dashboard
│   │   ├── listings/             # Browse listings
│   │   │   ├── page.tsx         # All listings
│   │   │   ├── [id]/page.tsx   # Listing detail
│   │   │   └── create/page.tsx  # Create listing
│   │   ├── inbox/                # Messaging
│   │   ├── community/            # Community posts
│   │   ├── profile/
│   │   └── settings/
│   ├── api/                      # API routes (if needed)
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
│
├── components/                   # React components
│   ├── ui/                       # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── modal.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── marketplace/              # Marketplace-specific
│   │   ├── ProductCard.tsx
│   │   ├── ListingForm.tsx
│   │   ├── SearchBar.tsx
│   │   └── ...
│   ├── chat/                     # Chat components
│   │   ├── ChatBubble.tsx
│   │   ├── MessageInput.tsx
│   │   ├── TypingIndicator.tsx
│   │   └── ...
│   ├── community/                # Community components
│   ├── auth/                     # Auth components
│   └── layout/                   # Layout components
│
├── lib/                          # Utilities & configurations
│   ├── supabase/
│   │   ├── client.ts            # Supabase client (browser)
│   │   ├── server.ts            # Supabase client (server)
│   │   ├── middleware.ts        # Auth middleware
│   │   └── db-helpers.ts        # Database query helpers
│   ├── paystack/
│   │   ├── client.ts            # Paystack integration
│   │   └── webhook-handler.ts
│   ├── utils/
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── ...
│   └── services/
│       ├── listing-service.ts
│       ├── chat-service.ts
│       ├── payment-service.ts
│       └── ...
│
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts
│   ├── useListings.ts
│   ├── useChat.ts
│   ├── usePayment.ts
│   └── ...
│
├── store/                        # Zustand stores
│   ├── auth-store.ts
│   ├── chat-store.ts
│   ├── monetization-store.ts
│   └── ...
│
├── types/                        # TypeScript types
│   ├── database.ts              # Supabase generated types
│   ├── api.ts
│   └── ...
│
├── styles/                       # Global styles
│   └── globals.css
│
├── public/                       # Static assets
│
├── middleware.ts                 # Next.js middleware (auth)
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 3. Project Setup

### 3.1 Initialize Next.js Project

```bash
# Create Next.js app with TypeScript and Tailwind
npx create-next-app@latest sellar-web --typescript --tailwind --app --use-npm

cd sellar-web

# Install core dependencies
npm install @supabase/supabase-js @supabase/ssr zustand react-hook-form zod lucide-react date-fns clsx tailwind-merge

# Install UI library (Choose one)
# Option 1: shadcn/ui (Recommended - similar to mobile app's component structure)
npx shadcn-ui@latest init

# Option 2: Chakra UI
npm install @chakra-ui/react @chakra-ui/next-js @emotion/react @emotion/styled framer-motion

# Install additional dependencies
npm install react-hot-toast swr axios
npm install -D @types/node @types/react @types/react-dom
```

### 3.2 Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cloudflare R2
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-r2-domain.com
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=sellar-media

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxx
PAYSTACK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_PAYSTACK_CALLBACK_URL=https://yoursite.com/api/paystack/callback

# Resend (for emails)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=no-reply@updates.sellarghana.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Sellar Ghana
```

### 3.3 Supabase Client Setup

**`lib/supabase/client.ts`** (Browser client)
```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```

**`lib/supabase/server.ts`** (Server client)
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export const createClient = () => {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle error
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle error
          }
        },
      },
    }
  )
}
```

**`middleware.ts`** (Auth middleware)
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 4. Database Schema

### 4.1 Core Tables Overview

The mobile app uses 40+ Supabase tables. Here are the most critical ones:

#### **Users & Authentication**
```sql
-- profiles: Extended user information
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    phone VARCHAR(20),
    location VARCHAR(255),
    bio TEXT,
    
    -- Business profile
    business_name VARCHAR(255),
    business_type VARCHAR(100),
    business_description TEXT,
    business_logo TEXT,
    business_name_priority VARCHAR(20), -- 'primary', 'secondary'
    
    -- Account settings
    account_type VARCHAR(20) DEFAULT 'individual', -- 'individual', 'business'
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(20),
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- Reputation & activity
    rating DECIMAL(2,1) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    response_time VARCHAR(50),
    last_seen TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN DEFAULT FALSE,
    
    -- Monetization
    total_credits INTEGER DEFAULT 0,
    free_listings_used INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Listings (Products)**
```sql
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Basic info
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(3) DEFAULT 'GHS',
    
    -- Category & attributes
    category_id UUID NOT NULL REFERENCES categories(id),
    attributes JSONB DEFAULT '{}',
    condition VARCHAR(20) CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
    
    -- Inventory
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    location VARCHAR(255) NOT NULL,
    
    -- Media
    images JSONB DEFAULT '[]',
    videos JSONB DEFAULT '[]',
    
    -- Settings
    accept_offers BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN 
        ('active', 'sold', 'draft', 'expired', 'suspended', 'pending', 'reserved', 'hidden')),
    
    -- Stats
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    
    -- Monetization features
    boost_until TIMESTAMP WITH TIME ZONE,
    boost_score INTEGER DEFAULT 0,
    urgent_until TIMESTAMP WITH TIME ZONE,
    spotlight_until TIMESTAMP WITH TIME ZONE,
    
    -- SEO
    seo_title VARCHAR(300),
    keywords TEXT[],
    
    -- Reservation (for offer system)
    reserved_until TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Categories**
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    parent_id UUID REFERENCES categories(id),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    attributes JSONB DEFAULT '[]', -- Dynamic category-specific attributes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Messages & Conversations**
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_1 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    participant_2 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    
    -- Soft delete (per user)
    deleted_for_participant_1 BOOLEAN DEFAULT FALSE,
    deleted_for_participant_2 BOOLEAN DEFAULT FALSE,
    deleted_at_participant_1 TIMESTAMP WITH TIME ZONE,
    deleted_at_participant_2 TIMESTAMP WITH TIME ZONE,
    
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(participant_1, participant_2)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN 
        ('text', 'image', 'offer', 'system', 'callback_request')),
    
    -- Media
    images JSONB,
    
    -- Offer data (for offer messages)
    offer_data JSONB,
    
    -- Read status
    read_at TIMESTAMP WITH TIME ZONE,
    
    status VARCHAR(20) DEFAULT 'sent',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Offers & Negotiations**
```sql
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    message TEXT,
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN 
        ('pending', 'accepted', 'rejected', 'countered', 'expired', 'withdrawn')),
    
    -- Negotiation chain
    parent_offer_id UUID REFERENCES offers(id),
    
    -- Expiry
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Community (Posts & Comments)**
```sql
CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL,
    images JSONB DEFAULT '[]',
    
    -- Engagement
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    
    -- Visibility
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
    is_pinned BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE community_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES community_comments(id),
    
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Monetization Tables**
```sql
-- Subscription Plans
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL, -- 'Sellar Pro'
    description TEXT,
    price_ghs DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    features JSONB DEFAULT '[]',
    highlights TEXT[],
    badge_text VARCHAR(50),
    trial_days INTEGER DEFAULT 14,
    max_listings INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Subscriptions
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN 
        ('active', 'cancelled', 'expired', 'past_due', 'trialing')),
    
    -- Trial
    is_trial BOOLEAN DEFAULT FALSE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    
    -- Billing
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    payment_reference VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit System
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    type VARCHAR(30) NOT NULL CHECK (type IN 
        ('earned', 'spent', 'purchase', 'refund', 'bonus', 'subscription_payment')),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    
    description TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature Purchases
CREATE TABLE feature_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    
    feature_type VARCHAR(50) NOT NULL CHECK (feature_type IN 
        ('boost', 'highlight', 'urgent', 'spotlight')),
    
    credits_spent INTEGER NOT NULL,
    duration_days INTEGER,
    
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Blocking System**
```sql
CREATE TABLE blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    reason VARCHAR(50), -- 'spam', 'harassment', 'inappropriate', 'other'
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);
```

#### **Notifications**
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    type VARCHAR(50) NOT NULL CHECK (type IN 
        ('message', 'offer', 'listing_update', 'review', 'like', 'comment', 
         'follower', 'payment', 'system')),
    
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    
    data JSONB DEFAULT '{}',
    
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4.2 Generate TypeScript Types

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Generate types
supabase gen types typescript --project-id your-project-id > types/database.ts
```

---

## 5. Authentication System

### 5.1 Auth Store (Zustand)

**`store/auth-store.ts`**
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, userData: any) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  
  forgotPassword: (email: string) => Promise<{ error?: string }>
  resetPassword: (password: string) => Promise<{ error?: string }>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ loading }),

      signIn: async (email: string, password: string) => {
        const supabase = createClient()
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          return { error: error.message }
        }

        set({ user: data.user, session: data.session })
        return {}
      },

      signUp: async (email: string, password: string, userData: any) => {
        const supabase = createClient()
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: userData,
          },
        })

        if (error) {
          return { error: error.message }
        }

        return {}
      },

      signOut: async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        set({ user: null, session: null })
      },

      forgotPassword: async (email: string) => {
        const supabase = createClient()
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })

        if (error) {
          return { error: error.message }
        }

        return {}
      },

      resetPassword: async (password: string) => {
        const supabase = createClient()
        
        const { error } = await supabase.auth.updateUser({
          password,
        })

        if (error) {
          return { error: error.message }
        }

        return {}
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
```

### 5.2 Auth Hook

**`hooks/useAuth.ts`**
```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'

export function useAuth() {
  const router = useRouter()
  const { user, session, setUser, setSession, setLoading } = useAuthStore()
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const requireAuth = () => {
    if (!user) {
      router.push('/sign-in')
      return false
    }
    return true
  }

  return {
    user,
    session,
    requireAuth,
  }
}
```

### 5.3 Auth Pages

**`app/(auth)/sign-in/page.tsx`**
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'

export default function SignInPage() {
  const router = useRouter()
  const { signIn } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      toast.error(error)
      setLoading(false)
      return
    }

    toast.success('Signed in successfully!')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Sellar
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/sign-up" className="font-medium text-primary-600 hover:text-primary-500">
              create a new account
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <Input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link href="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-500">
              Forgot your password?
            </Link>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

---

## 6. Core Features

### 6.1 Listings Management

**`lib/services/listing-service.ts`**
```typescript
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Listing = Database['public']['Tables']['listings']['Row']
type ListingInsert = Database['public']['Tables']['listings']['Insert']

export class ListingService {
  private supabase = createClient()

  async getListings(options: {
    category?: string
    search?: string
    minPrice?: number
    maxPrice?: number
    condition?: string
    location?: string
    limit?: number
    offset?: number
  } = {}) {
    let query = this.supabase
      .from('listings')
      .select(`
        *,
        profiles:user_id (
          id,
          first_name,
          last_name,
          business_name,
          avatar_url,
          rating
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (options.category) {
      query = query.eq('category_id', options.category)
    }

    if (options.search) {
      query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`)
    }

    if (options.minPrice) {
      query = query.gte('price', options.minPrice)
    }

    if (options.maxPrice) {
      query = query.lte('price', options.maxPrice)
    }

    if (options.condition) {
      query = query.eq('condition', options.condition)
    }

    if (options.location) {
      query = query.ilike('location', `%${options.location}%`)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error } = await query

    if (error) throw error

    return data as Listing[]
  }

  async getListing(id: string) {
    const { data, error } = await this.supabase
      .from('listings')
      .select(`
        *,
        profiles:user_id (*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    // Increment view count
    await this.incrementViewCount(id)

    return data
  }

  async createListing(listing: ListingInsert) {
    const { data, error } = await this.supabase
      .from('listings')
      .insert(listing)
      .select()
      .single()

    if (error) throw error

    return data
  }

  async updateListing(id: string, updates: Partial<ListingInsert>) {
    const { data, error } = await this.supabase
      .from('listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return data
  }

  async deleteListing(id: string) {
    const { error } = await this.supabase
      .from('listings')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  private async incrementViewCount(id: string) {
    await this.supabase.rpc('increment_views', { listing_id: id })
  }
}
```

### 6.2 Chat System

**`lib/services/chat-service.ts`**
```typescript
import { createClient } from '@/lib/supabase/client'

export class ChatService {
  private supabase = createClient()

  async getConversations(userId: string) {
    const { data, error } = await this.supabase
      .from('conversations')
      .select(`
        *,
        participant_1_profile:profiles!conversations_participant_1_fkey(*),
        participant_2_profile:profiles!conversations_participant_2_fkey(*),
        messages(
          id,
          content,
          created_at,
          read_at,
          sender_id
        )
      `)
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .or(`deleted_for_participant_1.eq.false,deleted_for_participant_2.eq.false`)
      .order('last_message_at', { ascending: false })

    if (error) throw error

    return data
  }

  async getMessages(conversationId: string) {
    const { data, error } = await this.supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return data
  }

  async sendMessage(conversationId: string, content: string, messageType = 'text') {
    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content,
        message_type: messageType,
      })
      .select()
      .single()

    if (error) throw error

    // Update conversation's last_message_at
    await this.supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)

    return data
  }

  async createConversation(participantId: string, listingId?: string) {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await this.supabase
      .from('conversations')
      .insert({
        participant_1: user.id,
        participant_2: participantId,
        listing_id: listingId,
      })
      .select()
      .single()

    if (error) throw error

    return data
  }

  subscribeToMessages(conversationId: string, onMessage: (message: any) => void) {
    return this.supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onMessage(payload.new)
        }
      )
      .subscribe()
  }
}
```

---

## 7. UI Components Library

### 7.1 Component Structure

Create a comprehensive component library matching the mobile app:

```
components/
├── ui/                    # Base components (shadcn/ui style)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── modal.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   └── ...
│
├── marketplace/
│   ├── ProductCard.tsx    # Main listing card
│   ├── ListingGrid.tsx
│   ├── ListingFilters.tsx
│   ├── CategoryPicker.tsx
│   └── SearchBar.tsx
│
├── chat/
│   ├── ChatBubble.tsx
│   ├── MessageInput.tsx
│   ├── ConversationList.tsx
│   └── TypingIndicator.tsx
│
└── layout/
    ├── Header.tsx
    ├── Footer.tsx
    └── Sidebar.tsx
```

### 7.2 Key Components

**ProductCard Component**
```typescript
import Image from 'next/image'
import Link from 'next/link'
import { Heart, MapPin } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ProductCardProps {
  listing: {
    id: string
    title: string
    price: number
    currency: string
    images: string[]
    location: string
    condition: string
    isFavorited?: boolean
  }
  onFavorite?: () => void
}

export function ProductCard({ listing, onFavorite }: ProductCardProps) {
  return (
    <Link href={`/listings/${listing.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative aspect-square">
          <Image
            src={listing.images[0] || '/placeholder.png'}
            alt={listing.title}
            fill
            className="object-cover"
          />
          {onFavorite && (
            <button
              onClick={(e) => {
                e.preventDefault()
                onFavorite()
              }}
              className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md"
            >
              <Heart
                className={`w-5 h-5 ${
                  listing.isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-400'
                }`}
              />
            </button>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-lg line-clamp-2 mb-2">
            {listing.title}
          </h3>
          
          <div className="flex items-center justify-between mb-2">
            <p className="text-2xl font-bold text-primary-600">
              {listing.currency} {listing.price.toLocaleString()}
            </p>
            <Badge variant="secondary">{listing.condition}</Badge>
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{listing.location}</span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
```

### 7.3 Theme System

**`lib/theme.ts`**
```typescript
export const theme = {
  colors: {
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      500: '#0ea5e9',
      600: '#0284c7',
      900: '#0c4a6e',
    },
    success: {
      500: '#10b981',
    },
    error: {
      500: '#ef4444',
    },
    warning: {
      500: '#f59e0b',
    },
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
  },
  
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  },
}
```

---

## 8. State Management

### 8.1 Zustand Stores

**Chat Store**
```typescript
import { create } from 'zustand'

interface ChatState {
  conversations: any[]
  activeConversationId: string | null
  unreadCounts: Record<string, number>
  typingUsers: Record<string, boolean>
  
  setConversations: (conversations: any[]) => void
  setActiveConversation: (id: string | null) => void
  setUnreadCount: (conversationId: string, count: number) => void
  setTypingUser: (conversationId: string, isTyping: boolean) => void
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  unreadCounts: {},
  typingUsers: {},
  
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setUnreadCount: (conversationId, count) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [conversationId]: count },
    })),
  setTypingUser: (conversationId, isTyping) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [conversationId]: isTyping },
    })),
}))
```

**Monetization Store**
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface MonetizationState {
  balance: number
  currentPlan: any | null
  isOnTrial: boolean
  trialEndsAt: string | null
  
  refreshCredits: () => Promise<void>
  refreshSubscription: () => Promise<void>
  spendCredits: (amount: number, purpose: string) => Promise<{ error?: string }>
}

export const useMonetizationStore = create<MonetizationState>()(
  persist(
    (set, get) => ({
      balance: 0,
      currentPlan: null,
      isOnTrial: false,
      trialEndsAt: null,
      
      refreshCredits: async () => {
        // Implementation
      },
      
      refreshSubscription: async () => {
        // Implementation
      },
      
      spendCredits: async (amount, purpose) => {
        // Implementation
      },
    }),
    {
      name: 'monetization-storage',
    }
  )
)
```

---

## 9. Real-time Features

### 9.1 Chat Real-time Updates

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useChatStore } from '@/store/chat-store'

export function useRealtimeMessages(conversationId: string) {
  const [messages, setMessages] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  return messages
}
```

### 9.2 Typing Indicators

```typescript
export function useTypingIndicator(conversationId: string, userId: string) {
  const supabase = createClient()
  const { setTypingUser } = useChatStore()
  
  const sendTypingStatus = (isTyping: boolean) => {
    const channel = supabase.channel(`typing:${conversationId}`)
    
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, isTyping },
    })
  }

  useEffect(() => {
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId !== userId) {
          setTypingUser(conversationId, payload.payload.isTyping)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  return { sendTypingStatus }
}
```

---

## 10. Payment Integration

### 10.1 Paystack Setup

**`lib/paystack/client.ts`**
```typescript
export class PaystackService {
  private publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!

  initializePayment(params: {
    email: string
    amount: number // in kobo (pesewas)
    reference: string
    metadata?: Record<string, any>
  }) {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      const handler = PaystackPop.setup({
        key: this.publicKey,
        email: params.email,
        amount: params.amount,
        ref: params.reference,
        metadata: params.metadata,
        onClose: () => {
          reject(new Error('Payment cancelled'))
        },
        callback: (response: any) => {
          resolve(response)
        },
      })

      handler.openIframe()
    })
  }
}
```

### 10.2 Payment Webhook

**`app/api/paystack/webhook/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-paystack-signature')

  // Verify signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)

  if (event.event === 'charge.success') {
    const supabase = createClient()
    
    // Process payment
    const { data: transaction } = await supabase
      .from('paystack_transactions')
      .select('*')
      .eq('reference', event.data.reference)
      .single()

    if (transaction) {
      // Handle different purchase types
      if (transaction.purchase_type === 'credit') {
        await supabase.rpc('add_user_credits', {
          p_user_id: transaction.user_id,
          p_credits: transaction.credits,
          p_reference: transaction.reference,
        })
      } else if (transaction.purchase_type === 'subscription') {
        await supabase
          .from('user_subscriptions')
          .update({
            status: 'active',
            payment_reference: transaction.reference,
          })
          .eq('id', transaction.purchase_id)
      }

      // Update transaction
      await supabase
        .from('paystack_transactions')
        .update({
          status: 'successful',
          verified_at: new Date().toISOString(),
        })
        .eq('id', transaction.id)
    }
  }

  return NextResponse.json({ received: true })
}
```

---

## 11. Content Moderation

### 11.1 Content Moderation Service

```typescript
import { createClient } from '@/lib/supabase/client'

export class ContentModerationService {
  private supabase = createClient()
  
  private profanityWords = [
    // List of inappropriate words
  ]

  async moderateContent(content: {
    title?: string
    description?: string
    images?: string[]
  }) {
    const issues: string[] = []

    // Check for profanity
    if (content.title || content.description) {
      const text = `${content.title} ${content.description}`.toLowerCase()
      
      for (const word of this.profanityWords) {
        if (text.includes(word)) {
          issues.push(`Inappropriate language detected: ${word}`)
        }
      }
    }

    // Check spam patterns
    const spamPatterns = [
      /\b(call|whatsapp)\s*me\s*on\b/i,
      /\b\d{10,}\b/, // Phone numbers
    ]

    for (const pattern of spamPatterns) {
      if (content.description && pattern.test(content.description)) {
        issues.push('Potential spam detected')
      }
    }

    return {
      isApproved: issues.length === 0,
      issues,
      requiresManualReview: issues.length > 0,
    }
  }
}
```

---

## 12. Performance Optimization

### 12.1 Image Optimization

```typescript
import Image from 'next/image'

export function OptimizedImage({ src, alt, ...props }: any) {
  return (
    <Image
      src={src}
      alt={alt}
      {...props}
      loading="lazy"
      placeholder="blur"
      blurDataURL="data:image/svg+xml;base64,..."
      quality={75}
    />
  )
}
```

### 12.2 Data Fetching with SWR

```typescript
import useSWR from 'swr'
import { ListingService } from '@/lib/services/listing-service'

export function useListings(options: any = {}) {
  const { data, error, mutate } = useSWR(
    ['listings', options],
    () => new ListingService().getListings(options),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  return {
    listings: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}
```

---

## 13. Deployment

### 13.1 Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### 13.2 Environment Variables on Vercel

Add all environment variables from `.env.local` to Vercel project settings.

### 13.3 Build Configuration

**`next.config.js`**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'your-supabase-project.supabase.co',
      'your-r2-domain.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'your-r2-domain.com',
      },
    ],
  },
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
```

---

## 14. Additional Features to Implement

### 14.1 Must-Have Features

1. **Search & Filters**
   - Full-text search
   - Category filters
   - Price range
   - Location-based search

2. **User Profile**
   - Profile editing
   - Avatar upload
   - Business profile setup
   - Verification badges

3. **Offers System**
   - Make offers
   - Counter offers
   - Accept/reject offers
   - Offer expiry (3 days)

4. **Favorites**
   - Add to favorites
   - Favorites list
   - Real-time sync

5. **Notifications**
   - In-app notifications
   - Browser push notifications
   - Email notifications

6. **Analytics Dashboard**
   - Listing views
   - Messages received
   - Sales metrics
   - Credit balance

### 14.2 Nice-to-Have Features

1. **Advanced Search**
   - Saved searches
   - Search alerts
   - AI-powered recommendations

2. **Social Features**
   - Follow users
   - Share listings
   - Community posts

3. **Enhanced Chat**
   - Voice messages
   - File attachments
   - Chat backup

4. **Seller Tools**
   - Bulk listing upload
   - CSV import/export
   - Listing templates

---

## 15. Testing Strategy

### 15.1 Unit Tests

```bash
npm install -D @testing-library/react @testing-library/jest-dom jest
```

### 15.2 E2E Tests

```bash
npm install -D @playwright/test
```

### 15.3 API Tests

```bash
npm install -D supertest
```

---

## 16. Key Differences from Mobile App

### Web-Specific Considerations

1. **Responsive Design**
   - Desktop layouts (2-3 columns)
   - Tablet layouts
   - Mobile-first approach

2. **Navigation**
   - Side navigation (desktop)
   - Bottom navigation (mobile web)
   - Breadcrumbs

3. **Performance**
   - Server-side rendering
   - Static generation where possible
   - Code splitting

4. **SEO**
   - Meta tags for all pages
   - Structured data (JSON-LD)
   - Sitemap generation
   - Open Graph tags

5. **Browser Features**
   - Browser notifications
   - Service workers for offline
   - Web Share API

---

## 17. Migration Plan

### Phase 1: Core Features (Month 1)
- [ ] Authentication system
- [ ] Listings browse & detail
- [ ] Basic search
- [ ] User profiles

### Phase 2: Communication (Month 2)
- [ ] Chat system
- [ ] Real-time messaging
- [ ] Typing indicators
- [ ] Notifications

### Phase 3: Monetization (Month 3)
- [ ] Payment integration
- [ ] Credit system
- [ ] Subscription plans
- [ ] Feature purchases

### Phase 4: Community & Advanced (Month 4)
- [ ] Community posts
- [ ] Offers system
- [ ] Analytics dashboard
- [ ] Admin panel

---

## 18. Resources & References

### Documentation
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Tailwind CSS: https://tailwindcss.com/docs
- Paystack: https://paystack.com/docs

### Component Libraries
- shadcn/ui: https://ui.shadcn.com
- Radix UI: https://www.radix-ui.com
- Headless UI: https://headlessui.com

### Tools
- Supabase CLI: https://supabase.com/docs/guides/cli
- Vercel CLI: https://vercel.com/docs/cli

---

## 19. Estimated Timeline & Budget

### Development Timeline
- **Setup & Infrastructure**: 1 week
- **Authentication & Core**: 2 weeks
- **Listings System**: 3 weeks
- **Chat System**: 2 weeks
- **Payment Integration**: 1 week
- **Community Features**: 2 weeks
- **Testing & Refinement**: 2 weeks
- **Deployment**: 1 week

**Total**: ~3-4 months for full replica

### Team Requirements
- 1-2 Full-stack developers (Next.js + Supabase)
- 1 UI/UX designer (optional, use existing mobile designs)
- 1 QA engineer

---

## 20. Final Notes

This guide provides a comprehensive blueprint for building the exact web replica of the Sellar mobile app. The architecture is designed to:

1. **Share the backend** with the mobile app (Supabase)
2. **Reuse business logic** where possible
3. **Maintain feature parity** with mobile
4. **Optimize for web performance**
5. **Provide better desktop experience**

### Key Success Factors

1. **Consistent Design**: Use the same color scheme, typography, and component structure
2. **Shared Data**: Both apps use the same Supabase database
3. **Real-time Sync**: Changes in web reflect in mobile and vice versa
4. **Performance**: Leverage Next.js features for optimal performance
5. **SEO**: Proper meta tags and structured data for discoverability

---

**Good luck with your web version development! 🚀**

