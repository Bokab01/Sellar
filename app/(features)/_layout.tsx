import React from 'react';
import { Stack } from 'expo-router';

export default function FeaturesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        animation: 'slide_from_bottom',
        gestureEnabled: true,
        gestureDirection: 'vertical',
      }}
    >
      <Stack.Screen name="search" />
      <Stack.Screen name="filters" />
      <Stack.Screen name="sort" />
      <Stack.Screen name="location-picker" />
    </Stack>
  );
}
