import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { 
  Search, 
  X, 
  Clock, 
  TrendingUp, 
  MapPin, 
  Tag,
  User,
  Filter
} from 'lucide-react-native';
import { useSearchSuggestions, useTrendingSearches, useSearchHistory } from '@/hooks/useSmartSearch';
import { SearchSuggestion } from '@/lib/smartSearchService';

interface SmartSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (query: string) => void;
  onFilterPress?: () => void;
  placeholder?: string;
  showFilters?: boolean;
  autoFocus?: boolean;
  style?: any;
}

export function SmartSearchBar({
  value,
  onChangeText,
  onSubmit,
  onFilterPress,
  placeholder = "Search for anything...",
  showFilters = true,
  autoFocus = false,
  style,
}: SmartSearchBarProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const { suggestions: searchSuggestions, loading: suggestionsLoading } = useSearchSuggestions(value);
  const { trending } = useTrendingSearches();
  const { history } = useSearchHistory();

  // Show suggestions when focused and has query or when empty (show trending/history)
  const shouldShowSuggestions = isFocused && (value.trim().length > 0 || trending.length > 0 || history.length > 0);

  useEffect(() => {
    setShowSuggestions(shouldShowSuggestions);
  }, [shouldShowSuggestions]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow for suggestion taps
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
    }, 150);
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    onChangeText(suggestion.text);
    onSubmit(suggestion.text);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      setShowSuggestions(false);
      Keyboard.dismiss();
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'category':
        return <Tag size={16} color={theme.colors.secondary} />;
      case 'location':
        return <MapPin size={16} color={theme.colors.secondary} />;
      case 'user':
        return <User size={16} color={theme.colors.secondary} />;
      case 'query':
      default:
        return <Search size={16} color={theme.colors.secondary} />;
    }
  };

  const getSuggestionsToShow = (): { title: string; data: SearchSuggestion[] }[] => {
    const sections: { title: string; data: SearchSuggestion[] }[] = [];

    if (value.trim().length > 0) {
      // Show search suggestions when typing
      if (searchSuggestions.length > 0) {
        sections.push({
          title: 'Suggestions',
          data: searchSuggestions.slice(0, 6)
        });
      }
    } else {
      // Show history and trending when not typing
      if (history.length > 0) {
        sections.push({
          title: 'Recent Searches',
          data: history.slice(0, 5)
        });
      }

      if (trending.length > 0) {
        sections.push({
          title: 'Trending',
          data: trending.slice(0, 5)
        });
      }
    }

    return sections;
  };

  const renderSuggestion = ({ item }: { item: SearchSuggestion }) => (
    <TouchableOpacity
      onPress={() => handleSuggestionPress(item)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <View style={{ marginRight: theme.spacing.md }}>
        {item.type === 'query' && value.trim().length === 0 ? (
          <Clock size={16} color={theme.colors.secondary} />
        ) : item.type === 'query' && trending.some(t => t.text === item.text) ? (
          <TrendingUp size={16} color={theme.colors.warning} />
        ) : (
          getSuggestionIcon(item.type)
        )}
      </View>
      
      <View style={{ flex: 1 }}>
        <Text variant="body" numberOfLines={1}>
          {item.text}
        </Text>
        {item.count && (
          <Text variant="caption" color="muted">
            {item.count} searches
          </Text>
        )}
      </View>

      {item.type === 'query' && trending.some(t => t.text === item.text) && (
        <View
          style={{
            backgroundColor: theme.colors.warning + '20',
            paddingHorizontal: theme.spacing.xs,
            paddingVertical: 2,
            borderRadius: theme.borderRadius.sm,
            marginLeft: theme.spacing.sm,
          }}
        >
          <Text variant="caption" style={{ color: theme.colors.warning, fontSize: 10 }}>
            Trending
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View
      style={{
        backgroundColor: theme.colors.surfaceVariant,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      <Text variant="caption" style={{ fontWeight: '600', textTransform: 'uppercase' }}>
        {section.title}
      </Text>
    </View>
  );

  return (
    <>
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            borderWidth: 1,
            borderColor: isFocused ? theme.colors.primary : theme.colors.border,
            paddingHorizontal: theme.spacing.md,
            minHeight: 48,
          },
          style,
        ]}
      >
        <Search size={20} color={theme.colors.secondary} style={{ marginRight: theme.spacing.sm }} />
        
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          autoFocus={autoFocus}
          returnKeyType="search"
          style={{
            flex: 1,
            fontSize: 16,
            color: theme.colors.text.primary,
            paddingVertical: theme.spacing.sm,
          }}
        />

        {value.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={{ marginLeft: theme.spacing.sm }}>
            <X size={20} color={theme.colors.secondary} />
          </TouchableOpacity>
        )}

        {showFilters && onFilterPress && (
          <TouchableOpacity
            onPress={onFilterPress}
            style={{
              marginLeft: theme.spacing.sm,
              padding: theme.spacing.xs,
            }}
          >
            <Filter size={20} color={theme.colors.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Suggestions Modal */}
      <Modal
        visible={showSuggestions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuggestions(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.1)',
          }}
          onPress={() => setShowSuggestions(false)}
        >
          <View
            style={{
              backgroundColor: theme.colors.surface,
              marginTop: 100, // Adjust based on search bar position
              marginHorizontal: theme.spacing.lg,
              borderRadius: theme.borderRadius.lg,
              maxHeight: 400,
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
            }}
          >
            <FlatList
              data={getSuggestionsToShow().flatMap(section => [
                { type: 'header', title: section.title },
                ...section.data
              ])}
              keyExtractor={(item, index) => 
                'title' in item ? `header-${item.title}` : `suggestion-${index}-${item.text}`
              }
              renderItem={({ item }) => {
                if ('title' in item) {
                  return renderSectionHeader({ section: item });
                }
                return renderSuggestion({ item });
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
