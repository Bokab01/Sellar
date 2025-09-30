import React, { useState, useCallback } from 'react';
import { View, Image, ImageSourcePropType, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface LazyImageProps {
  source: ImageSourcePropType;
  style?: any;
  onLoad?: () => void;
  onError?: () => void;
  placeholder?: React.ReactNode;
  showLoader?: boolean;
}

export const LazyImage = React.memo(function LazyImage({
  source,
  style,
  onLoad,
  onError,
  placeholder,
  showLoader = true,
}: LazyImageProps) {
  const { theme } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setError(true);
    onError?.();
  }, [onError]);

  if (error) {
    return (
      <View style={[style, { backgroundColor: theme.colors.border, justifyContent: 'center', alignItems: 'center' }]}>
        {placeholder || null}
      </View>
    );
  }

  return (
    <View style={style}>
      <Image
        source={source}
        style={[style, { opacity: loaded ? 1 : 0 }]}
        onLoad={handleLoad}
        onError={handleError}
        resizeMode="cover"
      />
      {!loaded && showLoader && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
        }}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
});
