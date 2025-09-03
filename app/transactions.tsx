import React from 'react';
import { View } from 'react-native';
import { Text, SafeAreaWrapper, AppHeader } from '@/components';
import { router } from 'expo-router';

const Transactions = () => {
  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Transactions"
        showBackButton
        onBackPress={() => router.back()}
      />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text variant="h3">Coming Soon</Text>
        <Text variant="body" color="muted" style={{ marginTop: 8 }}>
          Transaction history will be available here
        </Text>
      </View>
    </SafeAreaWrapper>
  )
}

export default Transactions;