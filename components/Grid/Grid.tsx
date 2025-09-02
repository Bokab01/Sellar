import React from 'react';
import { View, ScrollView, Dimensions, Image } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface GridProps {
  children: React.ReactNode[];
  columns?: number;
  spacing?: number;
  scrollable?: boolean;
  style?: any;
}

export function Grid({
  children,
  columns = 2,
  spacing,
  scrollable = false,
  style,
}: GridProps) {
  const { theme } = useTheme();
  const { width: screenWidth } = Dimensions.get('window');
  
  const gridSpacing = spacing ?? theme.spacing.xs;
  // Use minimal container padding for small spacing values (full-width mode)
  const containerPadding = (spacing !== undefined && spacing <= 8) ? spacing * 2 : theme.spacing.lg * 2;
  const totalSpacing = gridSpacing * (columns - 1);
  const itemWidth = (screenWidth - containerPadding - totalSpacing) / columns;

  const renderGrid = () => {
    const rows = [];
    for (let i = 0; i < children.length; i += columns) {
      const rowItems = children.slice(i, i + columns);
      
      rows.push(
        <View
          key={i}
          style={{
            flexDirection: 'row',
            gap: gridSpacing,
            marginBottom: i + columns < children.length ? gridSpacing : 0,
          }}
        >
          {rowItems.map((child, index) => (
            <View
              key={index}
              style={{
                width: itemWidth,
                flex: 0,
              }}
            >
              {child}
            </View>
          ))}
          
          {/* Fill empty spaces in the last row */}
          {rowItems.length < columns &&
            Array.from({ length: columns - rowItems.length }).map((_, index) => (
              <View
                key={`empty-${index}`}
                style={{
                  width: itemWidth,
                  flex: 0,
                }}
              />
            ))}
        </View>
      );
    }
    return rows;
  };

  const gridContent = (
    <View style={[{ flex: scrollable ? 0 : 1 }, style]}>
      {renderGrid()}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {gridContent}
      </ScrollView>
    );
  }

  return gridContent;
}