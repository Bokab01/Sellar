# Community and App Rewards Implementation

## Overview
This document outlines the complete implementation of the Community and App Rewards system that incentivizes positive community engagement by rewarding users with Credits.

## 🎯 Reward Types Implemented

### 1. Positive Review Reward (3 credits)
- **Trigger**: User receives a 4 or 5-star review
- **Process**: Automatically validates review legitimacy and awards credits
- **Database**: `handle_positive_review_reward()` trigger on `reviews` table

### 2. First Post Bonus (5 credits, one-time)
- **Trigger**: User creates their first community post
- **Process**: Checks if it's truly the first post and awards bonus
- **Database**: `handle_first_post_bonus()` trigger on `posts` table

### 3. App Referral Bonus (20 credits)
- **Trigger**: Successfully refer a new user
- **Process**: Manual claim via `claimReferralBonus()` function
- **Progress**: Tracks toward "Referral Master" achievement

### 4. Community Guardian (10 credits)
- **Trigger**: 5+ validated reports
- **Process**: Achievement-based reward for moderation help
- **Database**: `check_community_guardian_achievement()` function

### 5. Viral Post (10 credits)
- **Trigger**: Post receives 50+ likes
- **Process**: Automatically detected via `post_likes` trigger
- **Database**: `check_viral_post_reward()` trigger

### 6. Report Validation (5 credits)
- **Trigger**: Report leads to action taken
- **Process**: Awarded when report status changes to 'resolved' with 'action_taken'
- **Database**: `handle_report_validation_reward()` trigger

### 7. Anniversary Bonus (25 credits, yearly)
- **Trigger**: App anniversary (yearly)
- **Process**: Manual claim via `claimAnniversaryBonus()` function
- **Database**: `award_anniversary_bonus()` function

## 🗄️ Database Schema

### New Tables Created

#### `community_rewards`
```sql
CREATE TABLE community_rewards (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  reward_type VARCHAR(50) NOT NULL,
  credits_earned INTEGER NOT NULL,
  trigger_action VARCHAR(200) NOT NULL,
  reference_id UUID,
  reference_type VARCHAR(50),
  metadata JSONB,
  is_validated BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, reward_type, reference_id) WHERE reference_id IS NOT NULL
);
```

#### `user_achievements`
```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  achievement_type VARCHAR(50) NOT NULL,
  achievement_name VARCHAR(100) NOT NULL,
  description TEXT,
  credits_rewarded INTEGER NOT NULL,
  progress_current INTEGER DEFAULT 0,
  progress_required INTEGER DEFAULT 1,
  is_completed BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_type)
);
```

#### `user_reward_history`
```sql
CREATE TABLE user_reward_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  reward_type VARCHAR(50) NOT NULL,
  is_claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, reward_type)
);
```

### Key Functions

#### `award_community_credits()`
Main function for distributing rewards:
- Prevents duplicate rewards via unique constraints
- Updates `user_credits` table
- Logs transactions in `credit_transactions`
- Returns success/error status

#### `get_user_reward_summary()`
Returns comprehensive reward data:
- Total credits earned from rewards
- Total rewards count
- Achievements unlocked
- Recent rewards list

## 🎨 UI/UX Implementation

### My Rewards Screen (`/components/rewards/MyRewardsScreen.tsx`)
**Location**: Profile Tab → My Rewards

**Features**:
- **Overview Tab**: Credit summary, quick actions, recent achievements
- **Tracker Tab**: Progress indicators for all reward types
- **History Tab**: Complete reward history with dates

**Components**:
- Credit balance display with real-time updates
- Progress bars with animations
- Achievement badges
- Quick claim buttons for eligible rewards

### Rewards Tracker (`/components/rewards/RewardsTracker.tsx`)
**Features**:
- Category filtering (All, Community, Marketplace, Milestones)
- Progress visualization with animated bars
- Tips for earning each reward
- Completion status indicators

### Real-time Notifications (`/components/rewards/RewardNotification.tsx`)
**Features**:
- Automatic pop-up when rewards are earned
- Emoji indicators for different reward types
- Auto-dismiss after 4 seconds
- Manual close option

## 🔄 Real-time Integration

### Supabase Subscriptions
```typescript
// In useRewardsStore
subscribeToRewards: (onRewardReceived) => {
  const subscription = supabase
    .channel('user_rewards_changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'community_rewards',
      filter: `user_id=eq.${user.id}`
    }, (payload) => {
      const reward = payload.new as CommunityReward;
      if (onRewardReceived) {
        onRewardReceived(reward);
      }
      // Refresh local data
      get().fetchRewardSummary();
      get().fetchRecentRewards();
    })
    .subscribe();
}
```

### App-level Integration
```typescript
// In app/_layout.tsx
useEffect(() => {
  if (session) {
    const unsubscribe = subscribeToRewards((reward) => {
      setRewardNotification(reward);
    });
    return unsubscribe;
  }
}, [session]);
```

## 🛡️ Security & Validation

### Row Level Security (RLS)
All new tables have RLS policies:
```sql
-- Users can only view their own rewards
CREATE POLICY "Users can view own rewards"
  ON community_rewards
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### Duplicate Prevention
- Unique constraints prevent duplicate rewards for same actions
- Achievement progress tracking prevents multiple unlocks
- Anniversary bonus checks prevent multiple claims per year

### Validation Logic
- Review ratings validated (4-5 stars only)
- First post verification ensures genuine first post
- Report validation requires admin action
- Viral post threshold enforcement (50+ likes)

## 📊 State Management

### Zustand Store (`store/rewards.ts`)
```typescript
interface RewardsStore {
  rewardSummary: RewardSummary | null;
  recentRewards: CommunityReward[];
  availableRewards: any[];
  achievements: UserAchievement[];
  
  fetchRewardSummary: () => Promise<void>;
  fetchRecentRewards: () => Promise<void>;
  fetchAchievements: () => Promise<void>;
  claimAnniversaryBonus: () => Promise<Result>;
  claimReferralBonus: (refereeId, code?) => Promise<Result>;
  subscribeToRewards: (callback?) => () => void;
  getRewardProgress: (type) => ProgressInfo;
}
```

## 🚀 Usage Examples

### Claiming Anniversary Bonus
```typescript
const handleClaimAnniversary = async () => {
  const result = await claimAnniversaryBonus();
  if (result.success) {
    Alert.alert('🎉 Anniversary Bonus!', 
      `You've been awarded ${result.credits} credits!`);
  }
};
```

### Progress Tracking
```typescript
const progress = getRewardProgress('community_guardian');
// Returns: { current: 3, required: 5, percentage: 60 }
```

### Real-time Updates
```typescript
// Automatic credit balance updates via Supabase subscriptions
// Notification display for new rewards
// Achievement progress updates
```

## 📈 Analytics & Monitoring

### Reward Distribution Tracking
- Total credits awarded by type
- User engagement metrics
- Achievement completion rates
- Popular reward categories

### Performance Considerations
- Indexed tables for fast queries
- Efficient triggers with minimal overhead
- Real-time subscription management
- Memory leak prevention in React components

## 🎯 Future Enhancements

### Planned Features
1. **Seasonal Events**: Special limited-time rewards
2. **Streak Bonuses**: Daily engagement rewards
3. **Community Challenges**: Group achievement goals
4. **Leaderboards**: Top contributors showcase
5. **Badge System**: Visual achievement representations

### Expansion Opportunities
1. **Marketplace Integration**: Purchase-based rewards
2. **Social Features**: Friend rewards and challenges
3. **Gamification**: Levels, XP system, and progression
4. **Business Tools**: Seller-specific achievement tracks

##  Implementation Status

- [ ] Database schema and functions
- [ ] Automatic reward triggers (7 types)
- [ ] My Rewards UI screen
- [ ] Rewards tracker with progress
- [ ] Real-time notifications
- [ ] Profile tab integration
- [ ] Zustand state management
- [ ] RLS security policies
- [ ] Error handling and validation

## 🔧 Testing

### Test Scenarios
1. **Review Rewards**: Create 4-5 star reviews
2. **First Post**: Test with new user accounts
3. **Viral Posts**: Create posts and add likes
4. **Anniversary**: Test with mock user dates
5. **Real-time**: Verify notifications appear
6. **Edge Cases**: Duplicate rewards, invalid data

### Validation Checklist
- [ ] No duplicate rewards for same actions
- [ ] Real-time notifications display correctly
- [ ] Credit balances update immediately
- [ ] Achievement progress tracks accurately
- [ ] Anniversary bonus respects yearly limits
- [ ] Security policies prevent unauthorized access

This comprehensive rewards system provides a robust foundation for incentivizing positive community engagement while maintaining security and performance standards.
