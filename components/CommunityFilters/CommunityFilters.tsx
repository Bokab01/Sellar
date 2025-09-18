import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { Badge } from '@/components/Badge/Badge';
import { Filter, X, MapPin, Tag, ListFilterPlus } from 'lucide-react-native';

export interface CommunityFilters {
  postType: string | null;
  location: string | null;
}

interface CommunityFiltersProps {
  filters: CommunityFilters;
  onFiltersChange: (filters: CommunityFilters) => void;
  availableLocations?: string[];
}

const POST_TYPES = [
  { value: null, label: 'All Posts', icon: '📝' },
  { value: 'general', label: 'General', icon: '💬' },
  { value: 'listing', label: 'Listings', icon: '🏷️' },
  { value: 'review', label: 'Reviews', icon: '⭐' },
  { value: 'announcement', label: 'Announcements', icon: '📢' },
  { value: 'showcase', label: 'Showcase', icon: '🎨' },
  { value: 'question', label: 'Questions', icon: '❓' },
  { value: 'tips', label: 'Tips', icon: '💡' },
  { value: 'event', label: 'Events', icon: '📅' },
  { value: 'collaboration', label: 'Collaboration', icon: '🤝' },
];

const POPULAR_LOCATIONS = [
  'Accra',
  'Kumasi', 
  'Tamale',
  'Cape Coast',
  'Koforidua',
  'Sunyani',
  'Ho',
  'Bolgatanga',
  'Wa',
  'Techiman',
];

export function CommunityFilters({ 
  filters, 
  onFiltersChange, 
  availableLocations = [] 
}: CommunityFiltersProps) {
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [tempFilters, setTempFilters] = useState<CommunityFilters>(filters);

  const handleApplyFilters = () => {
    onFiltersChange(tempFilters);
    setShowModal(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = { postType: null, location: null };
    setTempFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    setShowModal(false);
  };

  const hasActiveFilters = filters.postType || filters.location;

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.postType) count++;
    if (filters.location) count++;
    return count;
  };

  const getFilterSummary = () => {
    const parts = [];
    if (filters.postType) {
      const type = POST_TYPES.find(t => t.value === filters.postType);
      parts.push(type?.label || filters.postType);
    }
    if (filters.location) {
      parts.push(filters.location);
    }
    return parts.join(' • ');
  };

  return (
    <>
      {/* Filter Bar */}
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
        }}
      >
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.colors.background,
            borderRadius: theme.borderRadius.lg,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <ListFilterPlus size={18} color={theme.colors.text.muted} />
            <Text 
              variant="body" 
              style={{ 
                marginLeft: theme.spacing.sm,
                flex: 1,
                color: hasActiveFilters ? theme.colors.text.primary : theme.colors.text.muted
              }}
            >
              {hasActiveFilters ? getFilterSummary() : 'Filter posts'}
            </Text>
          </View>
          
          {hasActiveFilters && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <Badge 
                text={getActiveFilterCount().toString()} 
                variant="primary" 
                size="sm" 
              />
              <TouchableOpacity
                onPress={handleClearFilters}
                style={{
                  padding: theme.spacing.xs,
                  borderRadius: theme.borderRadius.sm,
                  backgroundColor: theme.colors.error + '10',
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={14} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text variant="h3">Filter Posts</Text>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={{
                padding: theme.spacing.sm,
                borderRadius: theme.borderRadius.sm,
              }}
            >
              <X size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: theme.spacing.lg }}
            showsVerticalScrollIndicator={false}
          >
            {/* Post Type Filter */}
            <View style={{ marginBottom: theme.spacing.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                <Tag size={20} color={theme.colors.primary} />
                <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
                  Post Type
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                {POST_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value || 'all'}
                    onPress={() => setTempFilters(prev => ({ ...prev, postType: type.value }))}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                      borderRadius: theme.borderRadius.lg,
                      borderWidth: 1,
                      borderColor: tempFilters.postType === type.value 
                        ? theme.colors.primary 
                        : theme.colors.border,
                      backgroundColor: tempFilters.postType === type.value 
                        ? theme.colors.primary + '10' 
                        : theme.colors.surface,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ marginRight: theme.spacing.xs, fontSize: 16 }}>
                      {type.icon}
                    </Text>
                    <Text
                      variant="body"
                      style={{
                        color: tempFilters.postType === type.value 
                          ? theme.colors.primary 
                          : theme.colors.text.primary,
                        fontWeight: tempFilters.postType === type.value ? '600' : '400',
                      }}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Location Filter */}
            <View style={{ marginBottom: theme.spacing.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                <MapPin size={20} color={theme.colors.primary} />
                <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
                  Location
                </Text>
              </View>
              
              {/* All Locations Option */}
              <TouchableOpacity
                onPress={() => setTempFilters(prev => ({ ...prev, location: null }))}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.borderRadius.lg,
                  borderWidth: 1,
                  borderColor: tempFilters.location === null 
                    ? theme.colors.primary 
                    : theme.colors.border,
                  backgroundColor: tempFilters.location === null 
                    ? theme.colors.primary + '10' 
                    : theme.colors.surface,
                  marginBottom: theme.spacing.sm,
                }}
                activeOpacity={0.7}
              >
                <Text style={{ marginRight: theme.spacing.xs, fontSize: 16 }}>
                  🌍
                </Text>
                <Text
                  variant="body"
                  style={{
                    color: tempFilters.location === null 
                      ? theme.colors.primary 
                      : theme.colors.text.primary,
                    fontWeight: tempFilters.location === null ? '600' : '400',
                  }}
                >
                  All Locations
                </Text>
              </TouchableOpacity>

              {/* Popular Locations */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                {[...POPULAR_LOCATIONS, ...availableLocations]
                  .filter((location, index, self) => self.indexOf(location) === index) // Remove duplicates
                  .map((location) => (
                    <TouchableOpacity
                      key={location}
                      onPress={() => setTempFilters(prev => ({ ...prev, location }))}
                      style={{
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.sm,
                        borderRadius: theme.borderRadius.lg,
                        borderWidth: 1,
                        borderColor: tempFilters.location === location 
                          ? theme.colors.primary 
                          : theme.colors.border,
                        backgroundColor: tempFilters.location === location 
                          ? theme.colors.primary + '10' 
                          : theme.colors.surface,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        variant="body"
                        style={{
                          color: tempFilters.location === location 
                            ? theme.colors.primary 
                            : theme.colors.text.primary,
                          fontWeight: tempFilters.location === location ? '600' : '400',
                        }}
                      >
                        {location}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              gap: theme.spacing.md,
            }}
          >
            <Button
              variant="ghost"
              onPress={handleClearFilters}
              style={{ flex: 1 }}
            >
              Clear All
            </Button>
            <Button
              variant="primary"
              onPress={handleApplyFilters}
              style={{ flex: 1 }}
            >
              Apply Filters
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
}
