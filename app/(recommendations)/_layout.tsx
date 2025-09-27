import React from 'react';
import { Stack } from 'expo-router';

export default function RecommendationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="personalized" />
      <Stack.Screen name="trending" />
      <Stack.Screen name="recent" />
    </Stack>
  );
}
