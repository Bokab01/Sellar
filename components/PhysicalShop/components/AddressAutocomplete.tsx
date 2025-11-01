/**
 * AddressAutocomplete Component
 * Google Places-like address search with suggestions
 * Optimized with debouncing and caching
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { View, TextInput as RNTextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { MapPin, Search } from 'lucide-react-native';
import * as Location from 'expo-location';

interface AddressAutocompleteProps {
  value: string;
  onSelect: (address: {
    address: string;
    city: string;
    state: string;
    postal_code?: string;
    latitude: number;
    longitude: number;
  }) => void;
  placeholder?: string;
}

interface Suggestion {
  id: string;
  description: string;
  city: string;
  state: string;
}

const DEBOUNCE_DELAY = 500;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache
const cache = new Map<string, { data: Suggestion[]; timestamp: number }>();

export const AddressAutocomplete = memo<AddressAutocompleteProps>(({
  value,
  onSelect,
  placeholder = 'Search for address...',
}) => {
  const { theme } = useTheme();
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch suggestions (using Expo Location's geocoding as fallback)
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    // Check cache first
    const cached = cache.get(searchQuery);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setSuggestions(cached.data);
      return;
    }

    try {
      setIsLoading(true);

      // Use Expo Location's forward geocoding
      // Note: For production, consider using Google Places API for better results
      const results = await Location.geocodeAsync(searchQuery + ', Ghana');

      const formattedSuggestions: Suggestion[] = await Promise.all(
        results.slice(0, 5).map(async (result, index) => {
          // Reverse geocode to get detailed address
          const [addressInfo] = await Location.reverseGeocodeAsync({
            latitude: result.latitude,
            longitude: result.longitude,
          });

          return {
            id: `${result.latitude}-${result.longitude}-${index}`,
            description: `${addressInfo.street || ''} ${addressInfo.streetNumber || ''}`.trim() || 'Unknown Address',
            city: addressInfo.city || addressInfo.subregion || 'Accra',
            state: addressInfo.region || 'Greater Accra',
            latitude: result.latitude,
            longitude: result.longitude,
            postal_code: addressInfo.postalCode,
          };
        })
      );

      // Cache results
      cache.set(searchQuery, {
        data: formattedSuggestions,
        timestamp: Date.now(),
      });

      setSuggestions(formattedSuggestions);
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.trim().length >= 3) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(query);
      }, DEBOUNCE_DELAY);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, fetchSuggestions]);

  const handleSelectSuggestion = useCallback((suggestion: any) => {
    setQuery(suggestion.description);
    setShowSuggestions(false);
    onSelect({
      address: suggestion.description,
      city: suggestion.city,
      state: suggestion.state,
      postal_code: suggestion.postal_code,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });
  }, [onSelect]);

  return (
    <View>
      {/* Search Input */}
      <View style={{ position: 'relative' }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: showSuggestions ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.borderRadius.md,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          gap: theme.spacing.sm,
        }}>
          <Search size={20} color={theme.colors.text.muted} />
          <RNTextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.text.muted}
            style={{
              flex: 1,
              fontSize: 16,
              color: theme.colors.text.primary,
              padding: 0,
            }}
          />
          {isLoading && <ActivityIndicator size="small" color={theme.colors.primary} />}
        </View>
      </View>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.borderRadius.md,
          marginTop: theme.spacing.xs,
          maxHeight: 250,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
          zIndex: 1000,
        }}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                onPress={() => handleSelectSuggestion(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: theme.spacing.md,
                  gap: theme.spacing.sm,
                  borderBottomWidth: index < suggestions.length - 1 ? 1 : 0,
                  borderBottomColor: theme.colors.border,
                }}
              >
                <MapPin size={16} color={theme.colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text variant="body" numberOfLines={1}>
                    {item.description}
                  </Text>
                  <Text variant="caption" color="muted">
                    {item.city}, {item.state}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={{ padding: theme.spacing.md, alignItems: 'center' }}>
                <Text variant="bodySmall" color="muted">
                  No suggestions found
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* Hint Text */}
      <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.xs }}>
        Start typing to search for your address
      </Text>
    </View>
  );
});

AddressAutocomplete.displayName = 'AddressAutocomplete';

