import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { PostCard } from './PostCard';
import { Text } from '@/components/Typography/Text';
import { SafeAreaWrapper } from '@/components/Layout';

// Demo data to showcase all the enhanced features
const demoPostsData = [
  {
    id: '1',
    type: 'listing' as const,
    author: {
      id: 'user1',
      name: 'John Electronics',
      avatar: 'https://i.pravatar.cc/150?img=1',
      rating: 4.8,
      reviewCount: 127,
      isVerified: true,
      location: 'East Legon, Accra',
      profile: {
        display_business_name: true,
        business_name: 'John Electronics Store',
        is_verified: true,
      }
    },
    timestamp: '2 hours ago',
    content: 'Brand new iPhone 15 Pro Max available! Still in original packaging with warranty. Perfect condition, never used. Serious buyers only.',
    images: [
      'https://picsum.photos/400/300?random=1',
      'https://picsum.photos/400/300?random=2'
    ],
    likes_count: 24,
    comments_count: 8,
    shares_count: 3,
    isLiked: false,
    location: 'East Legon, Accra',
    listing: {
      id: 'listing1',
      title: 'iPhone 15 Pro Max - 256GB',
      price: 8500,
      image: 'https://picsum.photos/200/200?random=phone'
    }
  },
  {
    id: '2',
    type: 'promotion' as const,
    author: {
      id: 'user2',
      name: 'Sarah Fashion',
      avatar: 'https://i.pravatar.cc/150?img=2',
      rating: 4.6,
      reviewCount: 89,
      isVerified: false,
      location: 'Kumasi, Ghana',
      profile: {
        display_business_name: true,
        business_name: 'Sarah\'s Fashion Hub',
      }
    },
    timestamp: '4 hours ago',
    content: '🔥 FLASH SALE ALERT! 50% off all summer dresses this weekend only! Don\'t miss out on these amazing deals. Limited stock available!',
    images: ['https://picsum.photos/400/300?random=2', 'https://picsum.photos/400/300?random=3'],
    likes_count: 156,
    comments_count: 23,
    shares_count: 45,
    isLiked: true,
    location: 'Kumasi Central Market'
  },
  {
    id: '3',
    type: 'community' as const,
    author: {
      id: 'user3',
      name: 'Michael Tech',
      avatar: 'https://i.pravatar.cc/150?img=3',
      rating: 4.9,
      reviewCount: 203,
      isVerified: true,
      location: 'Tema, Ghana',
      profile: {
        display_business_name: false,
        full_name: 'Michael Asante',
      }
    },
    timestamp: '1 day ago',
    content: 'Just wanted to share my experience with the Sellar community. Amazing platform for buying and selling! The verification system really helps build trust. Highly recommend to everyone! 👍',
    likes_count: 89,
    comments_count: 34,
    shares_count: 12,
    isLiked: false,
    location: 'Tema Community 1'
  },
  {
    id: '4',
    type: 'announcement' as const,
    author: {
      id: 'user4',
      name: 'Sellar Team',
      avatar: 'https://i.pravatar.cc/150?img=4',
      rating: 5.0,
      reviewCount: 1250,
      isVerified: true,
      location: 'Accra, Ghana',
      profile: {
        display_business_name: true,
        business_name: 'Sellar Official',
        is_verified: true,
      }
    },
    timestamp: '2 days ago',
    content: '📢 New Feature Alert! We\'ve just launched our enhanced PostCard design with user ratings, location display, and follow functionality. Check it out and let us know what you think!',
    likes_count: 342,
    comments_count: 67,
    shares_count: 89,
    isLiked: false,
    location: 'Sellar HQ, Accra'
  }
];

export function PostCardDemo() {
  const { theme } = useTheme();
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({
    'user1': false,
    'user2': true, // Sarah is already being followed
    'user3': false,
    'user4': true, // Following Sellar Team
  });

  const handleFollow = (userId: string) => {
    setFollowingStates(prev => ({ ...prev, [userId]: true }));
  };

  const handleUnfollow = (userId: string) => {
    setFollowingStates(prev => ({ ...prev, [userId]: false }));
  };

  const handleLike = (postId: string) => {
    console.log('Liked post:', postId);
  };

  const handleComment = (postId: string) => {
    console.log('Comment on post:', postId);
  };

  const handleShare = (postId: string) => {
    console.log('Share post:', postId);
  };

  return (
    <SafeAreaWrapper>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.spacing.lg }}
      >
        <Text variant="h2" style={{ marginBottom: theme.spacing.xl, textAlign: 'center' }}>
          Enhanced PostCard Demo
        </Text>
        
        <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.xl, textAlign: 'center' }}>
          Showcasing all the new features: ratings, location, follow buttons, post types, and professional design
        </Text>

        {demoPostsData.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isFollowing={followingStates[post.author.id] || false}
            onLike={() => handleLike(post.id)}
            onComment={() => handleComment(post.id)}
            onShare={() => handleShare(post.id)}
            onFollow={() => handleFollow(post.author.id)}
            onUnfollow={() => handleUnfollow(post.author.id)}
            onReport={() => console.log('Report post:', post.id)}
          />
        ))}
      </ScrollView>
    </SafeAreaWrapper>
  );
}

/*
This demo showcases all the enhanced PostCard features:

1. ✅ Post Type Badges:
   - Listing (blue) - for marketplace posts
   - Promotion (orange) - for promotional content
   - Community (green) - for community discussions
   - Announcement (red) - for official announcements

2. ✅ User Ratings:
   - Star ratings with numeric values
   - Review counts displayed
   - Professional rating component

3. ✅ Location Display:
   - MapPin icons for visual clarity
   - User and post-specific locations
   - Truncated text for long names

4. ✅ Follow/Unfollow:
   - Inline follow buttons in header
   - Different states (Follow/Following)
   - Only shows for other users

5. ✅ Professional Design:
   - Larger avatars
   - Better spacing and typography
   - Enhanced shadows and borders
   - Improved action buttons
   - Modern, clean layout

6. ✅ No Timestamp:
   - Removed as requested
   - Cleaner header design

To use this demo, import and render <PostCardDemo /> in any screen.
*/
