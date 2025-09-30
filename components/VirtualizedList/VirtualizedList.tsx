import React, { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { View, ScrollView, Dimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface VirtualizedListProps<T> {
  data: T[];
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  style?: any;
}

const VirtualizedList = memo(function VirtualizedList<T>({
  data,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5,
  onScroll,
  style,
}: VirtualizedListProps<T>) {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollOffset / itemHeight) - overscan);
    const endIndex = Math.min(
      data.length - 1,
      Math.floor((scrollOffset + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollOffset, itemHeight, containerHeight, data.length, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    const items = [];
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (data[i]) {
        items.push({
          item: data[i],
          index: i,
          offset: i * itemHeight,
        });
      }
    }
    return items;
  }, [data, visibleRange, itemHeight]);

  // Handle scroll
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrollOffset(offsetY);
    onScroll?.(event);
  }, [onScroll]);

  // Total content height
  const totalHeight = data.length * itemHeight;

  return (
    <ScrollView
      ref={scrollViewRef}
      style={[{ height: containerHeight }, style]}
      contentContainerStyle={{ height: totalHeight }}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
    >
      <View style={{ position: 'relative' }}>
        {visibleItems.map(({ item, index, offset }) => (
          <View
            key={index}
            style={{
              position: 'absolute',
              top: offset,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem({ item, index })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
});

export { VirtualizedList };