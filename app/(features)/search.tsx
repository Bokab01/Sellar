import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { SafeAreaWrapper } from '@/components/Layout';
import { AppHeader } from '@/components/AppHeader/AppHeader';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { router } from 'expo-router';
import { Search, Filter, MapPin, SortAsc } from 'lucide-react-native';

export default function SearchScreen() {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [sortBy, setSortBy] = useState('relevance');

  const categories = [
    'Electronics', 'Fashion', 'Home & Garden', 'Vehicles', 
    'Sports', 'Books', 'Beauty', 'Health'
  ];

  const locations = [
    'Accra', 'Kumasi', 'Tamale', 'Tema', 'Cape Coast', 'Takoradi'
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
  ];

  const handleSearch = () => {
    // Navigate back with search parameters
    router.back();
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Advanced Search"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={[
          <Button
            key="search"
            variant="primary"
            size="sm"
            onPress={handleSearch}
          >
            Search
          </Button>
        ]}
      />

      <ScrollView style={{ flex: 1, padding: theme.spacing.lg }}>
        {/* Search Query */}
        <View style={{ marginBottom: theme.spacing.xl }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            What are you looking for?
          </Text>
          <Input
            placeholder="Search for items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Search size={20} color={theme.colors.text.muted} />}
          />
        </View>

        {/* Category Selection */}
        <View style={{ marginBottom: theme.spacing.xl }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Category
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'primary' : 'secondary'}
                  size="sm"
                  onPress={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Location Selection */}
        <View style={{ marginBottom: theme.spacing.xl }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Location
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              {locations.map((location) => (
                <Button
                  key={location}
                  variant={selectedLocation === location ? 'primary' : 'secondary'}
                  size="sm"
                  onPress={() => setSelectedLocation(location)}
                >
                  {location}
                </Button>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Sort Options */}
        <View style={{ marginBottom: theme.spacing.xl }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Sort By
          </Text>
          <View style={{ gap: theme.spacing.sm }}>
            {sortOptions.map((option) => (
              <Button
                key={option.value}
                variant={sortBy === option.value ? 'primary' : 'secondary'}
                size="sm"
                onPress={() => setSortBy(option.value)}
                style={{ justifyContent: 'flex-start' }}
              >
                {option.label}
              </Button>
            ))}
          </View>
        </View>

        {/* Search Button */}
        <Button
          variant="primary"
          size="lg"
          onPress={handleSearch}
          style={{ marginTop: theme.spacing.lg }}
        >
          Search Now
        </Button>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
