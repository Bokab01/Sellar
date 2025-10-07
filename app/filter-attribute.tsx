import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, SafeAreaWrapper, AppHeader, Button, Input } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { Check } from 'lucide-react-native';

export default function FilterAttributeScreen() {
  const { theme } = useTheme();
  const { filters, setFilters } = useAppStore();
  const { attributeId, attributeName, attributeType, options } = useLocalSearchParams<{
    attributeId: string;
    attributeName: string;
    attributeType: string;
    options: string;
  }>();

  const attributeKey = attributeName?.toLowerCase() || '';
  const rawOptions = options ? JSON.parse(options) : [];
  
  // Transform snake_case or value to display label
  const formatLabel = (value: string): string => {
    // Replace underscores with spaces and capitalize each word
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  // Normalize options - handle both string arrays and object arrays with {label, value}
  interface OptionItem {
    label: string;
    value: string;
  }
  
  const parsedOptions: OptionItem[] = rawOptions.map((opt: any) => {
    if (typeof opt === 'string') {
      return { label: formatLabel(opt), value: opt };
    }
    if (opt && typeof opt === 'object') {
      const value = opt.value || opt.label || String(opt);
      const label = opt.label || formatLabel(value);
      return { label, value };
    }
    const stringValue = String(opt);
    return { label: formatLabel(stringValue), value: stringValue };
  });
  
  const [selectedValues, setSelectedValues] = useState<string[]>(() => {
    const currentValue = filters.attributeFilters?.[attributeKey];
    if (Array.isArray(currentValue)) return currentValue;
    if (currentValue) return [currentValue];
    return [];
  });
  
  const [textValue, setTextValue] = useState(() => {
    const currentValue = filters.attributeFilters?.[attributeKey];
    return typeof currentValue === 'string' ? currentValue : '';
  });

  const handleToggle = (option: OptionItem) => {
    const newValues = selectedValues.includes(option.value)
      ? selectedValues.filter(v => v !== option.value)
      : [...selectedValues, option.value];
    setSelectedValues(newValues);
  };

  const handleApply = () => {
    const newAttributeFilters = { ...(filters.attributeFilters || {}) };
    
    if (attributeType === 'text' || attributeType === 'number') {
      if (textValue.trim()) {
        newAttributeFilters[attributeKey] = textValue.trim();
      } else {
        delete newAttributeFilters[attributeKey];
      }
    } else {
      if (selectedValues.length > 0) {
        newAttributeFilters[attributeKey] = selectedValues.length === 1 ? selectedValues[0] : selectedValues;
      } else {
        delete newAttributeFilters[attributeKey];
      }
    }
    
    setFilters({ ...filters, attributeFilters: newAttributeFilters });
    router.back();
  };

  const handleClearAll = () => {
    setSelectedValues([]);
    setTextValue('');
  };

  const hasSelection = attributeType === 'text' || attributeType === 'number' 
    ? textValue.trim() !== '' 
    : selectedValues.length > 0;

  return (
    <SafeAreaWrapper>
      <AppHeader
        title={attributeName || 'Filter'}
        showBackButton
        onBackPress={() => router.back()}
        rightActions={hasSelection ? [
          <TouchableOpacity
            key="clear"
            onPress={handleClearAll}
            style={{ paddingHorizontal: theme.spacing.md }}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
              Clear
            </Text>
          </TouchableOpacity>
        ] : []}
      />

      <ScrollView style={{ flex: 1 }}>
        {(attributeType === 'text' || attributeType === 'number') ? (
          <View style={{ padding: theme.spacing.lg }}>
            <Text variant="bodySmall" color="muted" style={{ marginBottom: theme.spacing.md }}>
              Enter {attributeName?.toLowerCase()}
            </Text>
            <Input
              placeholder={`Enter ${attributeName?.toLowerCase()}`}
              keyboardType={attributeType === 'number' ? 'numeric' : 'default'}
              value={textValue}
              onChangeText={setTextValue}
            />
          </View>
        ) : parsedOptions.length > 0 ? (
          parsedOptions.map((option: OptionItem, index: number) => (
            <TouchableOpacity
              key={`${option.value}-${index}`}
              onPress={() => handleToggle(option)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: theme.spacing.lg,
                paddingHorizontal: theme.spacing.lg,
                borderBottomWidth: index < parsedOptions.length - 1 ? 1 : 0,
                borderBottomColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              }}
              activeOpacity={0.7}
            >
              <Text 
                variant="body" 
                style={{ 
                  fontWeight: selectedValues.includes(option.value) ? '600' : '400',
                  color: selectedValues.includes(option.value) ? theme.colors.primary : theme.colors.text.primary
                }}
              >
                {option.label}
              </Text>
              {selectedValues.includes(option.value) && (
                <Check size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={{ padding: theme.spacing.lg, alignItems: 'center' }}>
            <Text variant="body" color="muted">
              No options available
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Apply Button */}
      <View
        style={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        <Button
          variant="primary"
          onPress={handleApply}
          size="lg"
        >
          Apply {hasSelection && `(${attributeType === 'text' || attributeType === 'number' ? '1' : selectedValues.length})`}
        </Button>
      </View>
    </SafeAreaWrapper>
  );
}
