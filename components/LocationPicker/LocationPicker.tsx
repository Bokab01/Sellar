import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { AppModal } from '@/components/Modal/Modal';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { MapPin, Search, ChevronRight, ArrowLeft, Plus } from 'lucide-react-native';
import { GHANA_REGIONS, MAJOR_CITIES } from '@/constants/ghana';

interface LocationPickerProps {
  value?: string;
  onLocationSelect: (location: string) => void;
  placeholder?: string;
  style?: any;
}

type SelectionStep = 'region' | 'city' | 'custom';

export function LocationPicker({
  value,
  onLocationSelect,
  placeholder = "Select location",
  style,
}: LocationPickerProps) {
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [currentStep, setCurrentStep] = useState<SelectionStep>('region');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [customCity, setCustomCity] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const resetPicker = () => {
    setCurrentStep('region');
    setSelectedRegion('');
    setCustomCity('');
    setShowCustomInput(false);
    setSearchText('');
  };

  const handleRegionSelect = (region: string) => {
    setSelectedRegion(region);
    setCurrentStep('city');
    setSearchText('');
  };

  const handleCitySelect = (city: string) => {
    const fullLocation = `${city}, ${selectedRegion}`;
    onLocationSelect(fullLocation);
    setShowPicker(false);
    resetPicker();
  };

  const handleCustomCitySubmit = () => {
    if (customCity.trim()) {
      const fullLocation = `${customCity.trim()}, ${selectedRegion}`;
      onLocationSelect(fullLocation);
      setShowPicker(false);
      resetPicker();
    }
  };

  const handleClose = () => {
    setShowPicker(false);
    resetPicker();
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
        onClose={handleClose}
        title={
          currentStep === 'region' 
            ? "Select Region" 
            : currentStep === 'city'
            ? `Cities in ${selectedRegion}`
            : "Add Custom City"
        }
        size="lg"
      >
        <View style={{ gap: theme.spacing.lg }}>
          {/* Back Button for City/Custom Steps */}
          {currentStep !== 'region' && (
            <Button
              variant="ghost"
              icon={<ArrowLeft size={16} />}
              onPress={() => {
                if (currentStep === 'custom') {
                  setCurrentStep('city');
                  setShowCustomInput(false);
                } else {
                  setCurrentStep('region');
                }
              }}
              size="sm"
            >
              Back
            </Button>
          )}

          {/* Search Input */}
          {currentStep !== 'custom' && (
            <Input
              placeholder={
                currentStep === 'region' 
                  ? "Search regions..." 
                  : "Search cities..."
              }
              value={searchText}
              onChangeText={setSearchText}
              leftIcon={<Search size={20} color={theme.colors.text.muted} />}
            />
          )}

          {/* Region Selection */}
          {currentStep === 'region' && (
            <ScrollView style={{ maxHeight: 400 }}>
              <View style={{ gap: theme.spacing.xs }}>
                {GHANA_REGIONS
                  .filter(region => 
                    region.toLowerCase().includes(searchText.toLowerCase())
                  )
                  .map((region) => (
                    <TouchableOpacity
                      key={region}
                      onPress={() => handleRegionSelect(region)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: theme.spacing.md,
                        paddingHorizontal: theme.spacing.lg,
                        borderRadius: theme.borderRadius.md,
                        backgroundColor: 'transparent',
                      }}
                      activeOpacity={0.7}
                    >
                      <Text variant="body">{region}</Text>
                      <ChevronRight size={16} color={theme.colors.text.muted} />
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>
          )}

          {/* City Selection */}
          {currentStep === 'city' && (
            <>
              <ScrollView style={{ maxHeight: 350 }}>
                <View style={{ gap: theme.spacing.xs }}>
                  {MAJOR_CITIES[selectedRegion]
                    ?.filter(city => 
                      city.toLowerCase().includes(searchText.toLowerCase())
                    )
                    .map((city) => (
                      <TouchableOpacity
                        key={city}
                        onPress={() => handleCitySelect(city)}
                        style={{
                          paddingVertical: theme.spacing.md,
                          paddingHorizontal: theme.spacing.lg,
                          borderRadius: theme.borderRadius.md,
                          backgroundColor: 'transparent',
                        }}
                        activeOpacity={0.7}
                      >
                        <Text variant="body">{city}</Text>
                      </TouchableOpacity>
                    )) || (
                    <View style={{ padding: theme.spacing.lg, alignItems: 'center' }}>
                      <Text variant="body" color="muted">
                        No cities available for this region
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Add Custom City Button */}
              <Button
                variant="secondary"
                icon={<Plus size={16} />}
                onPress={() => setCurrentStep('custom')}
                fullWidth
              >
                Add Custom City
              </Button>
            </>
          )}

          {/* Custom City Input */}
          {currentStep === 'custom' && (
            <View style={{ gap: theme.spacing.lg }}>
              <Text variant="body" color="secondary">
                Enter the name of your city in {selectedRegion}:
              </Text>
              
              <Input
                placeholder="Enter city name"
                value={customCity}
                onChangeText={setCustomCity}
                autoFocus
              />

              <Button
                variant="primary"
                onPress={handleCustomCitySubmit}
                disabled={!customCity.trim()}
                fullWidth
              >
                Add City
              </Button>
            </View>
          )}
        </View>
      </AppModal>
    </View>
  );
}
