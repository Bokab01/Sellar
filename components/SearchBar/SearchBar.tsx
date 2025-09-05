import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { Search, Filter, X } from 'lucide-react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearch?: () => void;
  onFilter?: () => void;
  onClear?: () => void;
  placeholder?: string;
  showFilter?: boolean;
  style?: any;
}

export function SearchBar({
  value,
  onChangeText,
  onSearch,
  onFilter,
  onClear,
  placeholder = "Search products...",
  showFilter = true,
  style,
}: SearchBarProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          backgroundColor: theme.colors.surface,
        },
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Input
          variant="search"
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
      </View>

      {value && onClear && (
        <Button
          variant="icon"
          icon={<X size={20} color={theme.colors.text.primary} />}
          onPress={onClear}
        />
      )}

      {showFilter && (
        <Button
          variant="icon"
          icon={<Filter size={20} color={theme.colors.text.primary} />}
          onPress={onFilter}
        />
      )}
    </View>
  );
}
