import { useEffect } from 'react';
import { router } from 'expo-router';

// Redirect to the new material top tabs reviews screen
const ReviewsScreen = () => {
  useEffect(() => {
    router.replace('/reviews-tabs/' as any);
  }, []);

  return null;
};

export default ReviewsScreen;
