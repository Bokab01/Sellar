import React from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { LoadingSkeleton } from './LoadingSkeleton';
import { Text } from '@/components/Typography/Text';

interface DashboardSkeletonProps {
  type: 'auto-refresh' | 'analytics' | 'overview' | 'support';
}

export function DashboardSkeleton({ type }: DashboardSkeletonProps) {
  const { theme } = useTheme();

  const renderAutoRefreshSkeleton = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={{ 
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
      }}>
        <LoadingSkeleton width="80%" height={24} style={{ marginBottom: theme.spacing.sm }} />
        <LoadingSkeleton width="60%" height={16} />
      </View>

      {/* Auto-Refresh Status Card */}
      <View style={{
        margin: theme.spacing.lg,
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        ...theme.shadows.sm
      }}>
        <LoadingSkeleton width="70%" height={20} style={{ marginBottom: theme.spacing.md }} />
        <LoadingSkeleton width="90%" height={16} style={{ marginBottom: theme.spacing.sm }} />
        <LoadingSkeleton width="50%" height={16} style={{ marginBottom: theme.spacing.lg }} />
        
        {/* Toggle Button Skeleton */}
        <LoadingSkeleton width={60} height={32} borderRadius={16} />
      </View>

      {/* Your Listings Section */}
      <View style={{ margin: theme.spacing.lg }}>
        <LoadingSkeleton width="40%" height={20} style={{ marginBottom: theme.spacing.md }} />
        
        {/* Listing Cards */}
        {Array.from({ length: 3 }, (_, index) => (
          <View key={index} style={{
            marginBottom: theme.spacing.md,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            ...theme.shadows.sm
          }}>
            <LoadingSkeleton width="80%" height={18} style={{ marginBottom: theme.spacing.sm }} />
            <LoadingSkeleton width="60%" height={14} style={{ marginBottom: theme.spacing.sm }} />
            
            {/* Status and Toggle Row */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: theme.spacing.sm 
            }}>
              <LoadingSkeleton width={80} height={24} borderRadius={12} />
              <LoadingSkeleton width={50} height={28} borderRadius={14} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderAnalyticsSkeleton = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={{ 
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
      }}>
        <LoadingSkeleton width="70%" height={24} style={{ marginBottom: theme.spacing.sm }} />
        <LoadingSkeleton width="50%" height={16} />
      </View>

      {/* Time Range Selector */}
      <View style={{
        margin: theme.spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-around'
      }}>
        {Array.from({ length: 3 }, (_, index) => (
          <LoadingSkeleton key={index} width={60} height={32} borderRadius={16} />
        ))}
      </View>

      {/* Stats Cards Grid */}
      <View style={{
        margin: theme.spacing.lg,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between'
      }}>
        {Array.from({ length: 4 }, (_, index) => (
          <View key={index} style={{
            width: '48%',
            marginBottom: theme.spacing.md,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            ...theme.shadows.sm
          }}>
            <LoadingSkeleton width="100%" height={40} style={{ marginBottom: theme.spacing.sm }} />
            <LoadingSkeleton width="80%" height={16} style={{ marginBottom: theme.spacing.xs }} />
            <LoadingSkeleton width="60%" height={14} />
          </View>
        ))}
      </View>

      {/* Chart Section */}
      <View style={{
        margin: theme.spacing.lg,
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        ...theme.shadows.sm
      }}>
        <LoadingSkeleton width="50%" height={20} style={{ marginBottom: theme.spacing.md }} />
        <LoadingSkeleton width="100%" height={200} borderRadius={theme.borderRadius.md} />
      </View>

      {/* Export Button */}
      <View style={{ margin: theme.spacing.lg }}>
        <LoadingSkeleton width="100%" height={48} borderRadius={theme.borderRadius.lg} />
      </View>
    </ScrollView>
  );

  const renderOverviewSkeleton = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={{ 
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
      }}>
        <LoadingSkeleton width="60%" height={24} style={{ marginBottom: theme.spacing.sm }} />
        <LoadingSkeleton width="40%" height={16} />
      </View>

      {/* Quick Stats */}
      <View style={{
        margin: theme.spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-between'
      }}>
        {Array.from({ length: 3 }, (_, index) => (
          <View key={index} style={{
            flex: 1,
            marginHorizontal: theme.spacing.xs,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            ...theme.shadows.sm
          }}>
            <LoadingSkeleton width="100%" height={32} style={{ marginBottom: theme.spacing.sm }} />
            <LoadingSkeleton width="80%" height={16} />
          </View>
        ))}
      </View>

      {/* Recent Activity */}
      <View style={{ margin: theme.spacing.lg }}>
        <LoadingSkeleton width="50%" height={20} style={{ marginBottom: theme.spacing.md }} />
        
        {Array.from({ length: 4 }, (_, index) => (
          <View key={index} style={{
            marginBottom: theme.spacing.sm,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            ...theme.shadows.sm
          }}>
            <LoadingSkeleton width="70%" height={16} style={{ marginBottom: theme.spacing.xs }} />
            <LoadingSkeleton width="50%" height={14} />
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderSupportSkeleton = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={{ 
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
      }}>
        <LoadingSkeleton width="50%" height={24} style={{ marginBottom: theme.spacing.sm }} />
        <LoadingSkeleton width="70%" height={16} />
      </View>

      {/* Support Options */}
      <View style={{ margin: theme.spacing.lg }}>
        {Array.from({ length: 4 }, (_, index) => (
          <View key={index} style={{
            marginBottom: theme.spacing.md,
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            ...theme.shadows.sm
          }}>
            <LoadingSkeleton width="60%" height={20} style={{ marginBottom: theme.spacing.sm }} />
            <LoadingSkeleton width="80%" height={16} style={{ marginBottom: theme.spacing.sm }} />
            <LoadingSkeleton width="40%" height={32} borderRadius={theme.borderRadius.lg} />
          </View>
        ))}
      </View>
    </ScrollView>
  );

  switch (type) {
    case 'auto-refresh':
      return renderAutoRefreshSkeleton();
    case 'analytics':
      return renderAnalyticsSkeleton();
    case 'overview':
      return renderOverviewSkeleton();
    case 'support':
      return renderSupportSkeleton();
    default:
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text>Loading...</Text>
        </View>
      );
  }
}
