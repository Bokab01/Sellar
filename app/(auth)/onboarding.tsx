import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Dimensions, Animated, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Text,
  SafeAreaWrapper,
  Container,
  Button,
  AppModal,
  LinkButton,
} from '@/components';
import { router } from 'expo-router';
import { 
  ShoppingBag, 
  Smartphone, 
  Headphones, 
  Shirt, 
  Car, 
  Home,
  ArrowRight,
  X,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MarketplaceItem {
  id: string;
  image: any;
  title: string;
  category: string;
  gradient: string[];
}

// Animated Card Component
const AnimatedCard = ({ item, index, theme }: { item: MarketplaceItem; index: number; theme: any }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    // Staggered entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    setPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
        width: (screenWidth - theme.spacing.xl * 2 - theme.spacing.md * 2) / 3,
        aspectRatio: 0.85,
        marginBottom: theme.spacing.sm,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          flex: 1,
          borderRadius: theme.borderRadius.lg,
          overflow: 'hidden',
        }}
      >
        {/* Image Background */}
        <Image
          source={item.image}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
          }}
          resizeMode="cover"
        />
        
        {/* Gradient Overlay */}
        <LinearGradient
          colors={(function buildSafeColors() {
            const toRgba = (hex: string, alpha = 1) => {
              if (!hex || typeof hex !== 'string') return `rgba(0,0,0,${alpha})`;
              if (hex.startsWith('rgb')) return hex;
              if (hex === 'transparent') return 'rgba(0,0,0,0)';
              const h = hex.replace('#', '');
              const isShort = h.length === 3;
              const r = parseInt(isShort ? h[0] + h[0] : h.substring(0, 2), 16) || 0;
              const g = parseInt(isShort ? h[1] + h[1] : h.substring(2, 4), 16) || 0;
              const b = parseInt(isShort ? h[2] + h[2] : h.substring(4, 6), 16) || 0;
              return `rgba(${r},${g},${b},${alpha})`;
            };
            const c0 = toRgba(item.gradient?.[0] || '#000000', 0);
            const c1 = toRgba(item.gradient?.[1] || theme.colors.primary, 0.8);
            const c2 = toRgba(item.gradient?.[2] || theme.colors.primary, 0.95);
            return [c0, c1, c2];
          })()}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '50%',
          }}
          locations={[0.4, 1, 1]}
        />

        {/* Content */}
        <View style={{
          flex: 1,
          padding: theme.spacing.sm,
          justifyContent: 'flex-end',
        }}>
          <Text 
            variant="bodySmall" 
            style={{ 
              color: '#ffffff',
              fontWeight: '700',
              fontSize: 11,
              textAlign: 'left',
              marginBottom: 2,
            }}
          >
            {item.title}
          </Text>
          <Text 
            variant="caption" 
            style={{ 
              color: '#ffffff',
              opacity: 0.95,
              fontSize: 9,
              textAlign: 'left',
              lineHeight: 11,
            }}
          >
            {item.category}
          </Text>
        </View>

        {/* Shimmer Effect on Press */}
        {pressed && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function OnboardingScreen() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  
  // Theme toggle animation
  const themeScale = useRef(new Animated.Value(1)).current;
  const themeRotate = useRef(new Animated.Value(0)).current;
  
  const handleThemeToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate the icon
    Animated.parallel([
      Animated.sequence([
        Animated.timing(themeScale, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(themeScale, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(themeRotate, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      themeRotate.setValue(0);
    });
    
    toggleTheme();
  };
  
  const rotateInterpolate = themeRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  
  // Parallax scroll animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });

  const marketplaceItems: MarketplaceItem[] = [
    {
      id: 'electronics',
      image: require('@/assets/onboarding/electronics.webp'),
      title: 'Electronics',
      category: 'Phones & Laptops',
      gradient: ['transparent', 'rgba(59, 130, 246, 0.8)', 'rgba(29, 78, 216, 0.95)'],
    },
    {
      id: 'fashion',
      image: require('@/assets/onboarding/fashion-ghana.webp'),
      title: 'Fashion',
      category: 'Clothing & Style',
      gradient: ['transparent', 'rgba(236, 72, 153, 0.8)', 'rgba(219, 39, 119, 0.95)'],
    },
    {
      id: 'vehicles',
      image: require('@/assets/onboarding/vehicles.webp'),
      title: 'Vehicles',
      category: 'Cars & Bikes',
      gradient: ['transparent', 'rgba(245, 158, 11, 0.8)', 'rgba(217, 119, 6, 0.95)'],
    },
    {
      id: 'home',
      image: require('@/assets/onboarding/home-and-furniture.webp'),
      title: 'Home & Furniture',
      category: 'Decor & Living',
      gradient: ['transparent', 'rgba(139, 92, 246, 0.8)', 'rgba(109, 40, 217, 0.95)'],
    },
    {
      id: 'beauty',
      image: require('@/assets/onboarding/health-and-beauty.webp'),
      title: 'Health & Beauty',
      category: 'Cosmetics & Care',
      gradient: ['transparent', 'rgba(236, 72, 153, 0.8)', 'rgba(190, 24, 93, 0.95)'],
    },
    {
      id: 'sports',
      image: require('@/assets/onboarding/sports.webp'),
      title: 'Sports',
      category: 'Fitness & Gear',
      gradient: ['transparent', 'rgba(16, 185, 129, 0.8)', 'rgba(5, 150, 105, 0.95)'],
    },
  ];

  const handleSignUp = () => {
    // Navigate directly to sign-up screen
    router.push('/(auth)/sign-up');
    // setShowSignUpModal(true);
  };

  const handleSignIn = () => {
    // Navigate directly to sign-in screen
    router.push('/(auth)/sign-in');
    // setShowSignInModal(true);
  };

  const handleEmailSignUp = () => {
    setShowSignUpModal(false);
    router.push('/(auth)/sign-up');
  };

  const handleEmailSignIn = () => {
    setShowSignInModal(false);
    router.push('/(auth)/sign-in');
  };

  const handleGoogleAuth = () => {
    // TODO: Implement Google authentication
  };

  const handleFacebookAuth = () => {
    // TODO: Implement Facebook authentication
  };

  return (
    <SafeAreaWrapper>
      <Animated.ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        <Container padding='sm'>
          <View style={{ flex: 1, paddingVertical: theme.spacing.md }}>
            
            {/* Theme Toggle Button - Top Right */}
            <View style={{
              position: 'absolute',
              top: theme.spacing.lg,
              right: theme.spacing.xs,
              zIndex: 10,
            }}>
              <TouchableOpacity
                onPress={handleThemeToggle}
                activeOpacity={0.7}
                style={{
                  width: 35,
                  height: 35,
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Animated.View
                  style={{
                    transform: [
                      { scale: themeScale },
                      { rotate: rotateInterpolate },
                    ],
                  }}
                >
                  {isDarkMode ? (
                    <Sun size={20} color={theme.colors.primary} />
                  ) : (
                    <Moon size={20} color={theme.colors.primary} />
                  )}
                </Animated.View>
              </TouchableOpacity>
            </View>
            
            {/* Header with Parallax Effect */}
            <Animated.View style={{ 
              alignItems: 'center', 
              marginBottom: theme.spacing.lg,
              marginTop: theme.spacing.xs,
              opacity: headerOpacity,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs,
                marginBottom: 4,
              }}>
                <Text 
                  variant="h1" 
                  style={{ 
                    fontSize: 28,
                    fontWeight: '800',
                    color: theme.colors.primary,
                    letterSpacing: -0.5,
                  }}
                >
                  Sellar
                </Text>
                <Sparkles size={20} color={theme.colors.primary} />
              </View>
              <Text 
                variant="body" 
                color="muted"
                style={{ 
                  fontSize: 13,
                  textAlign: 'center',
                  fontWeight: '500',
                }}
              >
                Made with you in mind
              </Text>
            </Animated.View>

            {/* Marketplace Items Grid with Animation */}
            <View style={{
              marginBottom: theme.spacing.xl,
            }}>
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
              }}>
                {marketplaceItems.map((item, index) => (
                  <AnimatedCard
                    key={item.id}
                    item={item}
                    index={index}
                    theme={theme}
                  />
                ))}
              </View>
            </View>

            {/* Call to Action with Enhanced Typography */}
            <View style={{
              alignItems: 'center',
              marginBottom: theme.spacing.md,
              paddingHorizontal: theme.spacing.xs,
            }}>
              <View style={{
                backgroundColor: theme.colors.primary + '10',
                paddingHorizontal: theme.spacing.md,
                paddingVertical: 6,
                borderRadius: theme.borderRadius.full,
                marginBottom: theme.spacing.md,
              }}>
                <Text 
                  variant="bodySmall" 
                  style={{ 
                    color: theme.colors.primary,
                    fontWeight: '600',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Ghana's Marketplace
                </Text>
              </View>

              <Text 
                variant="h2" 
                style={{ 
                  fontSize: 22,
                  fontWeight: '800',
                  textAlign: 'center',
                  marginBottom: theme.spacing.sm,
                  lineHeight: 28,
                  letterSpacing: -0.5,
                }}
              >
                Discover, Buy & Sell{'\n'}Items You Love
              </Text>
              
              <Text 
                variant="body" 
                color="muted"
                style={{ 
                  textAlign: 'center',
                  lineHeight: 20,
                  marginBottom: theme.spacing.lg,
                  paddingHorizontal: theme.spacing.sm,
                  fontSize: 14,
                }}
              >
                Connect with thousands of buyers and sellers across Ghana. List items, chat securely, and close deals with confidence.
              </Text>
            </View>

            {/* Action Buttons with Enhanced Design */}
            <View style={{ gap: theme.spacing.sm }}>
              <Button
                variant="primary"
                onPress={handleSignUp}
                fullWidth
                size='md'
                style={{
                  backgroundColor: theme.colors.primary,
                  paddingVertical: theme.spacing.md + 2,
                  borderRadius: theme.borderRadius.xl,
                  ...theme.shadows.sm,
                }}
              >
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                }}>
                  <Text 
                    variant="body" 
                    style={{ 
                      color: theme.colors.primaryForeground,
                      fontWeight: '700',
                      fontSize: 16,
                    }}
                  >
                    Get Started
                  </Text>
                  <ArrowRight size={18} color={theme.colors.primaryForeground} />
                </View>
              </Button>

              <Button
                variant="tertiary"
                onPress={handleSignIn}
                fullWidth
                size="md"
                style={{
                  borderColor: theme.colors.border,
                  borderWidth: 1.5,
                  paddingVertical: theme.spacing.md + 2,
                  borderRadius: theme.borderRadius.xl,
                  backgroundColor: theme.colors.surface,
                }}
              >
                <Text 
                  variant="body" 
                  style={{ 
                    color: theme.colors.text.primary,
                    fontWeight: '600',
                    fontSize: 16,
                  }}
                >
                  Sign In
                </Text>
              </Button>
            </View>

            {/* Footer */}
            <View style={{
              alignItems: 'center',
              marginTop: theme.spacing.lg,
              paddingTop: theme.spacing.md,
            }}>
              <LinkButton
                variant="muted"
                onPress={() => router.push('/(auth)/about')}
                style={{
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                }}
              >
                <Text 
                  variant="caption" 
                  color="muted"
                  style={{ 
                    textAlign: 'center',
                    fontSize: 13,
                    lineHeight: 16,
                    fontWeight: '500',
                  }}
                >
                  Learn more about Sellar
                </Text>
              </LinkButton>
            </View>
          </View>
        </Container>
      </Animated.ScrollView>
    </SafeAreaWrapper>
  );
}
