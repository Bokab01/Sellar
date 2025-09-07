# 🚀 Sellar Mobile App - Fresh Database Migration

This folder contains a complete, clean set of database migrations for your new Supabase project.

## 📋 Migration Order

Run these migrations in the exact order listed:

1. **01_extensions_and_core.sql** - Extensions and core setup
2. **02_profiles_and_auth.sql** - User profiles and authentication
3. **03_categories_and_listings.sql** - Categories and listings system
4. **04_messaging_and_chat.sql** - Messaging and chat system
5. **05_monetization_system.sql** - Credits, payments, subscriptions
6. **06_social_features.sql** - Reviews, favorites, follows
7. **07_moderation_system.sql** - Content moderation
8. **08_verification_system.sql** - User verification
9. **09_notifications_system.sql** - Push notifications and device tokens
10. **10_analytics_and_search.sql** - Search analytics and tracking
11. **11_storage_policies.sql** - File upload and storage policies
12. **12_rls_policies.sql** - Row Level Security policies
13. **13_functions_and_triggers.sql** - Database functions and triggers
14. **14_indexes_and_performance.sql** - Performance optimizations
15. **15_support_system.sql** - Support tickets and knowledge base
16. **16_reward_system.sql** - Community rewards and achievements
17. **17_business_plans.sql** - Business subscription plans and entitlements

## 🚀 Quick Setup (Recommended)

**Option 1: Run All Migrations at Once**
1. Create your new Supabase project
2. Go to SQL Editor in Supabase Dashboard
3. Copy and paste the entire contents of `setup_new_database.sql`
4. Click "Run" to execute all migrations
5. Update your `.env` file with new project credentials

**Option 2: Run Individual Migrations**
1. Create your new Supabase project
2. Go to SQL Editor in Supabase Dashboard
3. Run each migration file in order (01 through 17)
4. Update your `.env` file with new project credentials

## ✅ Features Included

- ✅ Complete user authentication and profiles
- ✅ Listings and categories system
- ✅ Messaging and chat
- ✅ Monetization (credits, payments)
- ✅ Social features (reviews, favorites)
- ✅ Content moderation
- ✅ User verification
- ✅ Push notifications
- ✅ Search and analytics
- ✅ File storage
- ✅ Support tickets and knowledge base
- ✅ Community rewards and achievements
- ✅ Business subscription plans
- ✅ Comprehensive RLS policies
- ✅ Performance optimizations

## 🛡️ Security Features

- Row Level Security (RLS) on all tables
- Secure authentication triggers
- Input validation and sanitization
- Rate limiting support
- Audit logging

## 🔧 After Migration Setup

1. **Update Environment Variables**
   ```bash
   # Update your .env file
   EXPO_PUBLIC_SUPABASE_URL=https://your-new-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-new-anon-key
   ```

2. **Test the Connection**
   ```bash
   # Clear Expo cache and restart
   npx expo start --clear
   ```

3. **Verify Setup**
   - Try signing up a new user
   - Check that profile is created automatically
   - Test basic app functionality

## 📊 Database Schema Overview

### Core Tables (42 total)
- `profiles` - User profiles and settings
- `listings` - Product/service listings  
- `categories` - Listing categories
- `messages` - Chat messages
- `conversations` - Chat conversations

### Monetization
- `user_credits` - User credit balances
- `credit_transactions` - Credit transaction history
- `paystack_transactions` - Payment processing

### Social Features
- `reviews` - User reviews and ratings
- `favorites` - User favorites
- `follows` - User following system

### System Tables
- `security_events` - Security audit log
- `device_tokens` - Push notification tokens
- `user_verification` - Verification requests
- `moderation_logs` - Content moderation logs

### Support System
- `support_tickets` - User support requests
- `support_ticket_messages` - Ticket conversations
- `kb_articles` - Knowledge base articles
- `kb_article_feedback` - Article feedback
- `faq_categories` - FAQ categories
- `faq_items` - FAQ questions and answers

### Reward System
- `community_rewards` - Community engagement rewards
- `user_achievements` - User achievement tracking
- `user_reward_history` - Reward claim history
- `reward_triggers` - Reward trigger configurations

### Business Plans
- `subscription_plans` - Business subscription plans (Starter, Pro, Premium)
- `user_subscriptions` - User subscription management
- `plan_entitlements` - Plan feature entitlements and limits

## 🐛 Troubleshooting

**If you get "Database error saving new user":**
- Check that all migrations ran successfully
- Verify the `handle_new_user()` function exists
- Ensure RLS policies are properly set

**If you get "Network request failed":**
- Clear Expo cache: `npx expo start --clear`
- Restart your development server
- Check your environment variables

**If signup works but profile isn't created:**
- Check the `auth.users` trigger is active
- Verify the `handle_new_user()` function logs

## 📞 Support

If you encounter any issues:
1. Check the Supabase logs in your dashboard
2. Verify all migrations completed successfully
3. Test with a simple signup to isolate the issue
