import { useState, useRef, useCallback } from 'react';
import { Animated } from 'react-native';

export function useFollowFeedback() {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const animation = useRef(new Animated.Value(0)).current;

  const showFollowFeedback = useCallback((text: string) => {
    setFeedbackText(text);
    setShowFeedback(true);
    
    // Reset animation value
    animation.setValue(0);
    
    // Start animation sequence
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(animation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowFeedback(false);
    });
  }, [animation]);

  return {
    showFeedback,
    feedbackText,
    animation,
    showFollowFeedback,
  };
}
