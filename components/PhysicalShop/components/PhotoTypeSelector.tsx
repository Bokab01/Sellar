/**
 * PhotoTypeSelector Component
 * Modal for selecting photo type category
 */

import React, { memo } from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { X } from 'lucide-react-native';
import { SHOP_PHOTO_TYPES } from '../types';
import type { ShopPhoto } from '../types';

interface PhotoTypeSelectorProps {
  visible: boolean;
  currentType: ShopPhoto['photo_type'];
  onSelect: (type: ShopPhoto['photo_type']) => void;
  onClose: () => void;
}

export const PhotoTypeSelector = memo<PhotoTypeSelectorProps>(({
  visible,
  currentType,
  onSelect,
  onClose,
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: theme.spacing.lg,
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}>
            <Text variant="h4">Select Photo Type</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Type List */}
          <ScrollView style={{ maxHeight: 400 }}>
            {SHOP_PHOTO_TYPES.map((type) => {
              const isSelected = type.value === currentType;
              return (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => onSelect(type.value)}
                  style={{
                    padding: theme.spacing.lg,
                    backgroundColor: isSelected
                      ? theme.colors.primary + '10'
                      : 'transparent',
                    borderLeftWidth: isSelected ? 4 : 0,
                    borderLeftColor: theme.colors.primary,
                  }}
                >
                  <Text
                    variant="body"
                    style={{
                      fontWeight: '600',
                      marginBottom: theme.spacing.xs,
                      color: isSelected
                        ? theme.colors.primary
                        : theme.colors.text.primary,
                    }}
                  >
                    {type.label}
                    {isSelected && ' ✓'}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    {type.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
});

PhotoTypeSelector.displayName = 'PhotoTypeSelector';

