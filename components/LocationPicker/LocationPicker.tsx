import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { AppModal } from '@/components/Modal/Modal';
import { Input } from '@/components/Input/Input';
import { MapPin, Search } from 'lucide-react-native';

interface LocationPickerProps {
  value?: string;
  onLocationSelect: (location: string) => void;
  placeholder?: string;
  style?: any;
}

export function LocationPicker({
  value,
  onLocationSelect,
  placeholder = "Select location",
  style,
}: LocationPickerProps) {
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Ghana regions and major cities
  const locations = [
    'Greater Accra Region',
    'Ashanti Region', 
    'Western Region',
    'Central Region',
    'Eastern Region',
    'Northern Region',
    'Upper East Region',
    'Upper West Region',
    'Volta Region',
    'Brong-Ahafo Region',
    // Major cities
    'Accra',
    'Kumasi',
    'Tamale',
    'Takoradi',
    'Cape Coast',
    'Sunyani',
    'Koforidua',
    'Ho',
    'Wa',
    'Bolgatanga',
  ];

  const filteredLocations = locations.filter(location =>
    location.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleLocationSelect = (location: string) => {
    onLocationSelect(location);
    setShowPicker(false);
    setSearchText('');
  };

  return (
    <View style={style}>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.borderRadius.md,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.md,
          minHeight: 48,
        }}
        activeOpacity={0.7}
      >
        <MapPin
          size={20}
          color={theme.colors.text.muted}
          style={{ marginRight: theme.spacing.sm }}
        />
        
        <Text
          variant="body"
          style={{
            flex: 1,
            color: value ? theme.colors.text.primary : theme.colors.text.muted,
          }}
        >
          {value || placeholder}
        </Text>
      </TouchableOpacity>

      <AppModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        title="Select Location"
        size="lg"
      >
        <View style={{ gap: theme.spacing.lg }}>
          <Input
            variant="search"
            placeholder="Search locations..."
            value={searchText}
            onChangeText={setSearchText}
          />

          <ScrollView style={{ maxHeight: 300 }}>
            <View style={{ gap: theme.spacing.xs }}>
              {filteredLocations.map((location) => (
                <TouchableOpacity
                  key={location}
                  onPress={() => handleLocationSelect(location)}
                  style={{
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.lg,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: value === location 
                      ? theme.colors.primary + '10' 
                      : 'transparent',
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    variant="body"
                    style={{
                      color: value === location 
                        ? theme.colors.primary 
                        : theme.colors.text.primary,
                      fontWeight: value === location ? '600' : '400',
                    }}
                  >
                    {location}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </AppModal>
    </View>
  );
}