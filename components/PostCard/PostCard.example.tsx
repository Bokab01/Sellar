// Example usage of the enhanced PostCard component
import React, { useState } from 'react';
import { PostCard } from './PostCard';

// Example data structure for the enhanced PostCard
const examplePost = {
  id: '1',
  type: 'listing' as const, // 'general' | 'listing' | 'promotion' | 'community' | 'announcement'
  author: {
    id: 'user123',
    name: 'John Doe',
    avatar: 'https://example.com/avatar.jpg',
    rating: 4.8,
    reviewCount: 127,
    isVerified: true,
    location: 'Accra, Ghana',
    profile: {
      display_business_name: true,
      business_name: 'John\'s Electronics',
      // ... other profile fields
    }
  },
  timestamp: '2 hours ago',
  content: 'Check out this amazing smartphone I have for sale! Brand new, still in box with warranty. Perfect for anyone looking for a reliable device.',
  images: [
    'https://example.com/phone1.jpg',
    'https://example.com/phone2.jpg'
  ],
  likes_count: 24,
  comments_count: 8,
  shares_count: 3,
  isLiked: false,
  location: 'East Legon, Accra',
  listing: {
    id: 'listing456',
    title: 'iPhone 15 Pro Max - 256GB',
    price: 8500,
    image: 'https://example.com/iphone.jpg'
  }
};

export function PostCardExample() {
  const [isFollowing, setIsFollowing] = useState(false);
  const [post, setPost] = useState(examplePost);

  const handleLike = () => {
    setPost(prev => ({
      ...prev,
      isLiked: !prev.isLiked,
      likes_count: prev.isLiked ? prev.likes_count - 1 : prev.likes_count + 1
    }));
  };

  const handleComment = () => {
    console.log('Open comments for post:', post.id);
  };

  const handleShare = () => {
    console.log('Share post:', post.id);
  };

  const handleFollow = () => {
    setIsFollowing(true);
    console.log('Following user:', post.author.id);
  };

  const handleUnfollow = () => {
    setIsFollowing(false);
    console.log('Unfollowed user:', post.author.id);
  };

  const handleReport = () => {
    console.log('Report post:', post.id);
  };

  return (
    <PostCard
      post={post}
      isFollowing={isFollowing}
      onLike={handleLike}
      onComment={handleComment}
      onShare={handleShare}
      onFollow={handleFollow}
      onUnfollow={handleUnfollow}
      onReport={handleReport}
    />
  );
}

/*
Key Features of the Enhanced PostCard:

1. ✅ Post Type Indicator
   - Shows badge for different post types (listing, promotion, community, announcement)
   - Color-coded with appropriate icons

2. ✅ User Rating Display
   - Shows star rating with numeric value
   - Displays review count if available
   - Uses the Rating component for consistency

3. ✅ Location Display
   - Shows user location or post-specific location
   - Uses MapPin icon for better visual recognition
   - Truncates long location names

4. ✅ Follow/Unfollow Functionality
   - Inline follow button in the header
   - Different states for following/not following
   - Only shows for other users (not own posts)

5. ✅ Removed Timestamp
   - Timestamp is no longer displayed as requested

6. ✅ Professional Design Improvements
   - Larger avatar (size="lg")
   - Better spacing and typography
   - Enhanced shadows and border radius
   - Improved action buttons with background highlights
   - Better visual hierarchy
   - Professional color scheme and layout

Usage Notes:
- The post.type field determines which badge is shown
- isFollowing prop controls the follow button state
- onFollow/onUnfollow callbacks handle the follow functionality
- All existing functionality (like, comment, share) is preserved
- The design is fully responsive and theme-aware
*/
