import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';

interface SimpleFeaturedListingsProps {
  maxItems?: number;
  showHeader?: boolean;
  layout?: 'horizontal' | 'grid';
  onViewAll?: () => void;
}

export function SimpleFeaturedListings({
  maxItems = 6,
  showHeader = true,
  layout = 'horizontal',
  onViewAll,
}: SimpleFeaturedListingsProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple timeout to simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <View style={{ padding: theme.spacing.lg }}>
        {showHeader && (
          <View style={{ marginBottom: theme.spacing.lg }}>
            <LoadingSkeleton width="60%" height={24} />
            <LoadingSkeleton width="40%" height={16} style={{ marginTop: theme.spacing.sm }} />
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <LoadingSkeleton
                key={index}
                width={280}
                height={200}
                style={{ borderRadius: theme.borderRadius.lg }}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: theme.spacing.xl }}>
      {showHeader && (
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
        }}>
          <View>
            <Text variant="h3" style={{ marginBottom: theme.spacing.xs }}>
              Featured Business Listings
            </Text>
            <Text variant="bodySmall" color="secondary">
              Premium listings from verified business users
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.md,
        }}
      >
        {Array.from({ length: maxItems }).map((_, index) => (
          <View 
            key={index} 
            style={{ 
              width: 280,
              height: 200,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              🏢 Business Listing {index + 1}
            </Text>
            <Text variant="caption" color="muted" style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
              Simplified placeholder
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
