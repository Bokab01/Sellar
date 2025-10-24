import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { X, MapPin, Tag, ChevronDown } from 'lucide-react-native';
import { GHANA_REGIONS } from '@/constants/ghana';

export interface CommunityFilters {
  postType: string | null;
  location: string | null;
}

interface CommunityFiltersProps {
  filters: CommunityFilters;
  onFiltersChange: (filters: CommunityFilters) => void;
  availableLocations?: string[];
  isVisible?: boolean;
  onClose?: () => void;
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


export function CommunityFilters({ 
  filters, 
  onFiltersChange, 
  availableLocations = [],
  isVisible = false,
  onClose = () => {},
}: CommunityFiltersProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [tempFilters, setTempFilters] = useState<CommunityFilters>(filters);
  const [showRegionModal, setShowRegionModal] = useState(false);

  // Update temp filters when modal opens
  React.useEffect(() => {
    if (isVisible) {
      setTempFilters(filters);
    }
  }, [isVisible, filters]);

  const handleApplyFilters = () => {
    onFiltersChange(tempFilters);
    onClose();
  };

  const handleClearFilters = () => {
    const clearedFilters = { postType: null, location: null };
    setTempFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onClose();
  };

  return (
    <>
      {/* Filter Modal */}
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: theme.spacing.lg,
              paddingTop: insets.top + theme.spacing.md,
              paddingBottom: theme.spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text variant="h3">Filter Posts</Text>
            <TouchableOpacity
              onPress={onClose}
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
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
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

            {/* Region Filter */}
            <View style={{ marginBottom: theme.spacing.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                <MapPin size={20} color={theme.colors.primary} />
                <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
                  Region
                </Text>
              </View>
              
              {/* Region Selection Button */}
              <TouchableOpacity
                onPress={() => setShowRegionModal(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.md,
                  borderRadius: theme.borderRadius.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                }}
                activeOpacity={0.7}
              >
                <Text
                  variant="body"
                  style={{
                    color: tempFilters.location !== undefined
                      ? theme.colors.text.primary 
                      : theme.colors.text.muted,
                    fontWeight: tempFilters.location !== undefined ? '500' : '400',
                  }}
                >
                  {tempFilters.location === null ? 'All Regions' : tempFilters.location || 'Select a region'}
                </Text>
                <ChevronDown 
                  size={20} 
                  color={theme.colors.text.muted}
                />
              </TouchableOpacity>
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

      {/* Region Selection Modal */}
      <Modal
        visible={showRegionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRegionModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowRegionModal(false)}>
          <View style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end'
          }}>
            <TouchableWithoutFeedback>
              <View style={{ 
                backgroundColor: theme.colors.background,
                borderTopLeftRadius: theme.borderRadius.xl,
                borderTopRightRadius: theme.borderRadius.xl,
                maxHeight: '70%',
                minHeight: '60%'
              }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.md,
              paddingBottom: theme.spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text variant="h3">Select Region</Text>
            <TouchableOpacity
              onPress={() => setShowRegionModal(false)}
              style={{
                padding: theme.spacing.sm,
                borderRadius: theme.borderRadius.sm,
              }}
            >
              <X size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Region List */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: theme.spacing.lg }}
            showsVerticalScrollIndicator={true}
          >
            {/* All Regions Option */}
            <TouchableOpacity
              onPress={() => {
                setTempFilters(prev => ({ ...prev, location: null }));
                setShowRegionModal(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.md,
                borderRadius: theme.borderRadius.lg,
                borderWidth: 1,
                borderColor: tempFilters.location === null 
                  ? theme.colors.primary 
                  : theme.colors.border,
                backgroundColor: tempFilters.location === null 
                  ? theme.colors.primary + '10' 
                  : theme.colors.surface,
                marginBottom: theme.spacing.md,
              }}
              activeOpacity={0.7}
            >
              
              <Text
                variant="h4"
                style={{
                  color: tempFilters.location === null 
                    ? theme.colors.primary 
                    : theme.colors.text.primary,
                  fontWeight: tempFilters.location === null ? '600' : '400',
                }}
              >
                All Regions
              </Text>
            </TouchableOpacity>

            {/* Region Options */}
            <View style={{ gap: theme.spacing.xs }}>
              {GHANA_REGIONS.map((region) => (
                  <TouchableOpacity
                    key={region}
                    onPress={() => {
                      setTempFilters(prev => ({ ...prev, location: region }));
                      setShowRegionModal(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                      borderRadius: theme.borderRadius.lg,
                      borderWidth: 1,
                      borderColor: tempFilters.location === region 
                        ? theme.colors.primary 
                        : theme.colors.border,
                      backgroundColor: tempFilters.location === region 
                        ? theme.colors.primary + '10' 
                        : theme.colors.surface,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      variant="body"
                      style={{
                        color: tempFilters.location === region 
                          ? theme.colors.primary 
                          : theme.colors.text.primary,
                        fontWeight: tempFilters.location === region ? '600' : '400',
                      }}
                    >
                      {region}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
