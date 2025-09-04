import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Input } from '@/components/Input/Input';
import { Chip } from '@/components/Chip/Chip';
import { type CategoryAttribute } from '@/constants/categoryAttributes';

interface CategoryAttributesProps {
  attributes: CategoryAttribute[];
  values: Record<string, string | string[]>;
  onChange: (attributeId: string, value: string | string[]) => void;
}

export function CategoryAttributes({ attributes, values = {}, onChange }: CategoryAttributesProps) {
  const { theme } = useTheme();

  if (!attributes || attributes.length === 0) {
    return null;
  }

  const renderAttribute = (attribute: CategoryAttribute) => {
    const value = values?.[attribute.id] || (attribute.type === 'multiselect' ? [] : '');

    switch (attribute.type) {
      case 'text':
        return (
          <Input
            key={attribute.id}
            label={attribute.name + (attribute.required ? ' *' : '')}
            placeholder={attribute.placeholder}
            value={value as string}
            onChangeText={(text) => onChange(attribute.id, text)}
          />
        );

      case 'number':
        return (
          <Input
            key={attribute.id}
            label={attribute.name + (attribute.required ? ' *' : '') + (attribute.unit ? ` (${attribute.unit})` : '')}
            placeholder={attribute.placeholder}
            value={value as string}
            onChangeText={(text) => onChange(attribute.id, text)}
            keyboardType="numeric"
          />
        );

      case 'select':
        return (
          <View key={attribute.id} style={{ gap: theme.spacing.sm }}>
            <Text variant="bodySmall" style={{ fontWeight: '500' }}>
              {attribute.name}{attribute.required && ' *'}
            </Text>
            <View style={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              gap: theme.spacing.sm 
            }}>
              {attribute.options?.map((option) => (
                <Chip
                  key={option.value}
                  text={option.label}
                  variant="filter"
                  selected={value === option.value}
                  onPress={() => onChange(attribute.id, option.value)}
                />
              ))}
            </View>
          </View>
        );

      case 'multiselect':
        return (
          <View key={attribute.id} style={{ gap: theme.spacing.sm }}>
            <Text variant="bodySmall" style={{ fontWeight: '500' }}>
              {attribute.name}{attribute.required && ' *'}
            </Text>
            <View style={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              gap: theme.spacing.sm 
            }}>
              {attribute.options?.map((option) => {
                const selectedValues = Array.isArray(value) ? value : [];
                const isSelected = selectedValues.includes(option.value);
                
                return (
                  <Chip
                    key={option.value}
                    text={option.label}
                    variant="filter"
                    selected={isSelected}
                    onPress={() => {
                      const newValues = isSelected
                        ? selectedValues.filter(v => v !== option.value)
                        : [...selectedValues, option.value];
                      onChange(attribute.id, newValues);
                    }}
                  />
                );
              })}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={{
        backgroundColor: theme.colors.primary + '10',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
      }}>
        <Text variant="bodySmall" style={{ color: theme.colors.primary, textAlign: 'center' }}>
          ✨ Add specific details to help buyers find exactly what they&apos;re looking for
        </Text>
      </View>
      
      {attributes.map(renderAttribute)}
    </View>
  );
}
