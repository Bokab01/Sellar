import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useRecommendations } from '@/hooks/useRecommendations';
import { Text } from '@/components/Typography/Text';
import { Search, X, Clock, TrendingUp } from 'lucide-react-native';

interface SearchSuggestion {
  suggestion_id: string;
  suggestion_text: string;
  suggestion_type: string;
  relevance_score: number;
}

interface EnhancedSearchBarProps {
  onSearch: (query: string, filters?: Record<string, any>) => void;
  onSuggestionPress?: (suggestion: string) => void;
  placeholder?: string;
  style?: any;
}

export function EnhancedSearchBar({
  onSearch,
  onSuggestionPress,
  placeholder = "Search for items...",
  style
}: EnhancedSearchBarProps) {
  const { theme } = useTheme();
  const { getSearchSuggestions, recordSearchHistory } = useRecommendations();
  
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Debounced search suggestions
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length > 1) {
      setLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const data = await getSearchSuggestions(query.trim(), 8);
          
          // Deduplicate suggestions by suggestion_text (case-insensitive)
          const uniqueSuggestions = data.reduce((acc, current) => {
            const exists = acc.find(
              item => item.suggestion_text.toLowerCase() === current.suggestion_text.toLowerCase()
            );
            if (!exists) {
              acc.push(current);
            }
            return acc;
          }, [] as typeof data);
          
          setSuggestions(uniqueSuggestions);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error fetching search suggestions:', error);
        } finally {
          setLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoading(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, getSearchSuggestions]);

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    // Record search history
    await recordSearchHistory(searchQuery.trim());

    // Hide suggestions
    setShowSuggestions(false);
    inputRef.current?.blur();

    // Trigger search
    onSearch(searchQuery.trim());
  };

  const handleSuggestionPress = async (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    
    // If onSuggestionPress is provided, call it instead of onSearch
    // This prevents double navigation when parent handles suggestions
    if (onSuggestionPress) {
      // Let parent handle search history recording to avoid duplicate records
      onSuggestionPress(suggestion);
    } else {
      // Only record search history if parent doesn't handle it
      await recordSearchHistory(suggestion);
      onSearch(suggestion);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const formatLastSearched = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const renderSuggestion = ({ item }: { item: SearchSuggestion }) => {
    const icon = item.suggestion_type === 'recent_search' ? Clock : TrendingUp;
    const IconComponent = icon;
    
    return (
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: theme.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
        onPress={() => handleSuggestionPress(item.suggestion_text)}
        activeOpacity={0.7}
      >
        <IconComponent size={16} color={theme.colors.text.muted} />
        <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
          <Text variant="body" numberOfLines={1}>
            {item.suggestion_text}
          </Text>
          <Text variant="caption" color="muted">
            {item.suggestion_type === 'recent_search' ? 'Recent' : item.suggestion_type === 'listing' ? 'Popular Listing' : 'Category'}
          </Text>
        </View>
        {item.relevance_score > 0.9 && (
          <TrendingUp size={14} color={theme.colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[{ position: 'relative' }, style]}>
      {/* Search Input */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }}
      >
        <Search size={20} color={theme.colors.text.muted} />
        
        <TextInput
          ref={inputRef}
          style={{
            flex: 1,
            marginLeft: theme.spacing.sm,
            fontSize: 16,
            color: theme.colors.text.primary,
            paddingVertical: theme.spacing.xs,
          }}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.muted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => handleSearch()}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        
        {query.length > 0 && (
          <TouchableOpacity
            onPress={clearSearch}
            style={{ padding: theme.spacing.xs }}
            activeOpacity={0.7}
          >
            <X size={18} color={theme.colors.text.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <View
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            marginTop: theme.spacing.xs,
            maxHeight: 300,
            zIndex: 1000,
            ...theme.shadows.lg,
          }}
        >
          <View style={{ paddingVertical: theme.spacing.sm }}>
            <Text
              variant="caption"
              color="muted"
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingBottom: theme.spacing.sm,
                fontWeight: '600',
              }}
            >
              Recent Searches
            </Text>
            
            <FlatList
              data={suggestions}
              renderItem={renderSuggestion}
              keyExtractor={(item, index) => `${item.suggestion_id}-${item.suggestion_text}-${index}`}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      )}

      {/* Loading indicator */}
      {loading && (
        <View
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            marginTop: theme.spacing.xs,
            padding: theme.spacing.md,
            zIndex: 1000,
          }}
        >
          <Text variant="bodySmall" color="muted" style={{ textAlign: 'center' }}>
            Loading suggestions...
          </Text>
        </View>
      )}
    </View>
  );
}
