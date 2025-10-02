import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { LoadingSkeleton } from './LoadingSkeleton';

interface PostCardSkeletonProps {
  showImage?: boolean;
}

export function PostCardSkeleton({ showImage = false }: PostCardSkeletonProps) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        marginBottom: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <View style={{ padding: theme.spacing.md }}>
        {/* Post type badge */}
        <LoadingSkeleton
          width={80}
          height={20}
          borderRadius={theme.borderRadius.full}
          style={{ marginBottom: theme.spacing.sm }}
        />
        
        {/* Author info */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <LoadingSkeleton
            width={40}
            height={40}
            borderRadius={20}
          />
          <View style={{ flex: 1 }}>
            <LoadingSkeleton width="60%" height={16} style={{ marginBottom: 4 }} />
            <LoadingSkeleton width="40%" height={12} />
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm }}>
        <LoadingSkeleton width="100%" height={14} style={{ marginBottom: 6 }} />
        <LoadingSkeleton width="90%" height={14} style={{ marginBottom: 6 }} />
        <LoadingSkeleton width="70%" height={14} />
      </View>

      {/* Image (optional) */}
      {showImage && (
        <LoadingSkeleton
          width="100%"
          height={200}
          borderRadius={0}
          style={{ marginVertical: theme.spacing.sm }}
        />
      )}

      {/* Footer actions */}
      <View style={{
        flexDirection: 'row',
        padding: theme.spacing.md,
        paddingTop: theme.spacing.sm,
        gap: theme.spacing.lg,
      }}>
        <LoadingSkeleton width={60} height={20} borderRadius={theme.borderRadius.sm} />
        <LoadingSkeleton width={60} height={20} borderRadius={theme.borderRadius.sm} />
        <LoadingSkeleton width={60} height={20} borderRadius={theme.borderRadius.sm} />
      </View>
    </View>
  );
}

