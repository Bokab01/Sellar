import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Search, TrendingUp } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTrendingSearches } from '@/hooks/useSmartSearch';

interface QuickSearchProps {
  style?: any;
}

export function QuickSearch({ style }: QuickSearchProps) {
  const { theme } = useTheme();
  const { trending } = useTrendingSearches();

  const handleSearchPress = () => {
    router.push('/search');
  };

  const handleTrendingPress = (query: string) => {
    router.push({
      pathname: '/search',
      params: { q: query }
    });
  };

  return (
    <View style={style}>
      {/* Search Bar Placeholder */}
      <TouchableOpacity
        onPress={handleSearchPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.md,
          marginBottom: theme.spacing.md,
        }}
      >
        <Search size={20} color={theme.colors.secondary} />
        <Text
          variant="body"
          color="muted"
          style={{ marginLeft: theme.spacing.sm, flex: 1 }}
        >
          Search for anything...
        </Text>
      </TouchableOpacity>

      {/* Trending Searches */}
      {trending.length > 0 && (
        <View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.sm,
            }}
          >
            <TrendingUp size={16} color={theme.colors.warning} />
            <Text
              variant="bodySmall"
              style={{
                marginLeft: theme.spacing.xs,
                fontWeight: '600',
                color: theme.colors.warning,
              }}
            >
              Trending
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: theme.spacing.xs,
            }}
          >
            {trending.slice(0, 6).map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleTrendingPress(item.text)}
                style={{
                  backgroundColor: theme.colors.primaryContainer,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xs,
                  borderRadius: theme.borderRadius.md,
                }}
              >
                <Text
                  variant="caption"
                  style={{
                    color: theme.colors.primary,
                    fontWeight: '500',
                  }}
                >
                  {item.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
