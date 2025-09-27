import React from 'react';
import { Stack } from 'expo-router';

export default function BusinessLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="support" />
      <Stack.Screen name="auto-refresh" />
    </Stack>
  );
}
