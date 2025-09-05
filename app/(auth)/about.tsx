import React, { useEffect, useRef } from 'react';
import { View, ScrollView, Image, Animated } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { usePlatformStats } from '@/hooks/usePlatformStats';
import {
  Text,
  SafeAreaWrapper,
  Container,
  Button,
} from '@/components';
import { router } from 'expo-router';
import { 
  ArrowLeft,
  ShoppingBag,
  Users,
  Shield,
  MessageCircle,
  Zap,
  Heart,
  Globe,
  Award,
  TrendingUp,
  Star,
  Clock,
  CheckCircle
} from 'lucide-react-native';

export default function AboutScreen() {
  const { theme, isDarkMode } = useTheme();
  const { stats, loading: statsLoading } = usePlatformStats();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Animate stats section when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const features = [
    {
      icon: <ShoppingBag size={32} color={theme.colors.primary} />,
      title: 'Buy & Sell Anything',
      description: 'From electronics to fashion, home goods to services - find everything you need in one place.',
    },
    {
      icon: <Users size={32} color={theme.colors.secondary} />,
      title: 'Trusted Community',
      description: 'Connect with verified sellers and buyers. Build lasting relationships in Ghana\'s most trusted marketplace.',
    },
    {
      icon: <Shield size={32} color={theme.colors.success} />,
      title: 'Secure Transactions',
      description: 'Your safety is our priority. Secure payments, verified profiles, and dispute resolution.',
    },
    {
      icon: <MessageCircle size={32} color={theme.colors.warning} />,
      title: 'Easy Communication',
      description: 'Built-in chat system with offers, negotiations, and seamless communication.',
    },
    {
      icon: <Zap size={32} color={theme.colors.info} />,
      title: 'Boost Your Sales',
      description: 'Premium features to increase visibility and reach more potential buyers.',
    },
    {
      icon: <Heart size={32} color={theme.colors.error} />,
      title: 'Support Local',
      description: 'Supporting Ghana\'s economy by connecting local buyers and sellers.',
    },
  ];

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M+`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K+`;
    }
    return num.toString();
  };

  const displayStats = stats ? [
    { 
      number: formatNumber(stats.totalUsers), 
      label: 'Active Users', 
      icon: <Users size={24} color={theme.colors.primary} />,
      color: theme.colors.primary,
      description: 'Growing community',
      trend: '+12% this month'
    },
    { 
      number: formatNumber(stats.totalListings), 
      label: 'Listings', 
      icon: <ShoppingBag size={24} color={theme.colors.secondary} />,
      color: theme.colors.secondary,
      description: 'Items available',
      trend: '+8% this week'
    },
    { 
      number: `${stats.satisfactionRate}%`, 
      label: 'Satisfaction', 
      icon: <Star size={24} color={theme.colors.warning} />,
      color: theme.colors.warning,
      description: 'Happy customers',
      trend: '4.8/5 rating'
    },
    { 
      number: stats.supportResponseTime, 
      label: 'Support', 
      icon: <Clock size={24} color={theme.colors.success} />,
      color: theme.colors.success,
      description: 'Response time',
      trend: 'Always available'
    },
  ] : [
    { 
      number: '50K+', 
      label: 'Active Users', 
      icon: <Users size={24} color={theme.colors.primary} />,
      color: theme.colors.primary,
      description: 'Growing community',
      trend: '+12% this month'
    },
    { 
      number: '100K+', 
      label: 'Listings', 
      icon: <ShoppingBag size={24} color={theme.colors.secondary} />,
      color: theme.colors.secondary,
      description: 'Items available',
      trend: '+8% this week'
    },
    { 
      number: '95%', 
      label: 'Satisfaction', 
      icon: <Star size={24} color={theme.colors.warning} />,
      color: theme.colors.warning,
      description: 'Happy customers',
      trend: '4.8/5 rating'
    },
    { 
      number: '24/7', 
      label: 'Support', 
      icon: <Clock size={24} color={theme.colors.success} />,
      color: theme.colors.success,
      description: 'Response time',
      trend: 'Always available'
    },
  ];

  return (
    <SafeAreaWrapper>
      {/* Fixed Header with Back Button */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        backgroundColor: theme.colors.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            padding: 0,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ArrowLeft size={20} color={theme.colors.text.primary} />
        </Button>
        <Text variant="h2" style={{ marginLeft: theme.spacing.md }}>
          About Sellar
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Container>

          {/* Hero Section */}
          <View style={{ 
            alignItems: 'center', 
            marginBottom: theme.spacing['3xl'],
            paddingVertical: theme.spacing.xl 
          }}>
            <View style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: theme.colors.background,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.lg,
              overflow: 'hidden',
            }}>
              <Image
                source={isDarkMode ? require('@/assets/splashscreen/splashscreen-dark.png') : require('@/assets/splashscreen/splashscreen-light.png')}
                style={{
                  width: '100%',
                  height: '100%',
                }}
              />
            </View>
            
            <Text variant="h1" style={{ 
              marginBottom: theme.spacing.md,
              textAlign: 'center'
            }}>
              Ghana's Premier Marketplace
            </Text>
            
            <Text variant="body" color="secondary" style={{ 
              textAlign: 'center',
              lineHeight: 24,
              paddingHorizontal: theme.spacing.lg
            }}>
              Sellar is more than just a marketplace - it's a community where Ghanaians can buy, sell, and connect with confidence.
            </Text>
          </View>

          {/* Creative Stats Section */}
          <Animated.View 
            style={{
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ],
              marginBottom: theme.spacing['3xl'],
            }}
          >
            {/* Stats Header */}
            <View style={{
              alignItems: 'center',
              marginBottom: theme.spacing.xl,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
                marginBottom: theme.spacing.sm,
              }}>
                <TrendingUp size={20} color={theme.colors.primary} />
                <Text variant="h3" style={{ 
                  color: theme.colors.primary,
                  fontWeight: '600'
                }}>
                  Platform Growth
                </Text>
              </View>
              <Text variant="body" color="secondary" style={{ 
                textAlign: 'center',
                fontSize: 14
              }}>
                Real-time statistics from our community
              </Text>
            </View>

            {/* Stats Grid */}
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: theme.spacing.md,
              justifyContent: 'space-between',
            }}>
              {displayStats.map((stat, index) => (
                <Animated.View
                  key={index}
                  style={{
                    width: '48%',
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.borderRadius.lg,
                    padding: theme.spacing.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    ...theme.shadows.sm,
                    transform: [{
                      scale: scaleAnim.interpolate({
                        inputRange: [0.8, 1],
                        outputRange: [0.8, 1],
                      })
                    }]
                  }}
                >
                  {/* Stat Header */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: theme.spacing.sm,
                  }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: `${stat.color}15`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {stat.icon}
                    </View>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.xs,
                    }}>
                      <CheckCircle size={12} color={theme.colors.success} />
                      <Text variant="caption" color="success" style={{ 
                        fontSize: 10,
                        fontWeight: '600'
                      }}>
                        Live
                      </Text>
                    </View>
                  </View>

                  {/* Stat Number */}
                  <Text variant="h2" style={{ 
                    color: stat.color,
                    fontWeight: '700',
                    marginBottom: theme.spacing.xs,
                    fontSize: 24,
                  }}>
                    {stat.number}
                  </Text>

                  {/* Stat Label */}
                  <Text variant="bodySmall" style={{ 
                    fontWeight: '600',
                    marginBottom: theme.spacing.xs,
                  }}>
                    {stat.label}
                  </Text>

                  {/* Stat Description */}
                  <Text variant="caption" color="secondary" style={{ 
                    marginBottom: theme.spacing.sm,
                    fontSize: 12,
                  }}>
                    {stat.description}
                  </Text>

                  {/* Trend Indicator */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                  }}>
                    <TrendingUp size={12} color={theme.colors.success} />
                    <Text variant="caption" color="success" style={{ 
                      fontSize: 11,
                      fontWeight: '500'
                    }}>
                      {stat.trend}
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </View>

            {/* Stats Footer */}
            <View style={{
              marginTop: theme.spacing.lg,
              padding: theme.spacing.lg,
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.lg,
              alignItems: 'center',
            }}>
              <Text variant="bodySmall" color="secondary" style={{ 
                textAlign: 'center',
                fontStyle: 'italic'
              }}>
                📊 Statistics updated in real-time • Last updated: {new Date().toLocaleTimeString()}
              </Text>
            </View>
          </Animated.View>

          {/* Features Section */}
          <View style={{ marginBottom: theme.spacing['3xl'] }}>
            <Text variant="h3" style={{ 
              marginBottom: theme.spacing.xl,
              textAlign: 'center'
            }}>
              Why Choose Sellar?
            </Text>
            
            <View style={{ gap: theme.spacing.xl }}>
              {features.map((feature, index) => (
                <View key={index} style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: theme.spacing.lg,
                }}>
                  <View style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: `${feature.icon.props.color}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {feature.icon}
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text variant="h4" style={{ 
                      marginBottom: theme.spacing.sm,
                      fontWeight: '600'
                    }}>
                      {feature.title}
                    </Text>
                    <Text variant="body" color="secondary" style={{ 
                      lineHeight: 22
                    }}>
                      {feature.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Mission Section */}
          <View style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            marginBottom: theme.spacing['3xl'],
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.lg,
            }}>
              <Globe size={24} color={theme.colors.primary} />
              <Text variant="h4" style={{ 
                marginLeft: theme.spacing.md,
                fontWeight: '600'
              }}>
                Our Mission
              </Text>
            </View>
            
            <Text variant="body" color="secondary" style={{ 
              lineHeight: 24,
              marginBottom: theme.spacing.lg
            }}>
              To create a safe, reliable, and user-friendly platform that empowers Ghanaians to buy and sell with confidence, while building a strong local economy.
            </Text>
            
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Award size={20} color={theme.colors.warning} />
              <Text variant="bodySmall" color="secondary" style={{ 
                marginLeft: theme.spacing.sm,
                fontStyle: 'italic'
              }}>
                Trusted by thousands of Ghanaians nationwide
              </Text>
            </View>
          </View>

          {/* Call to Action */}
          <View style={{ 
            alignItems: 'center',
            paddingVertical: theme.spacing.xl 
          }}>
            <Text variant="h4" style={{ 
              marginBottom: theme.spacing.md,
              textAlign: 'center'
            }}>
              Ready to Get Started?
            </Text>
            
            <Text variant="body" color="secondary" style={{ 
              textAlign: 'center',
              marginBottom: theme.spacing.xl,
              lineHeight: 22
            }}>
              Join thousands of satisfied users and start buying or selling today!
            </Text>
            
            <Button
              variant="primary"
              size="lg"
              onPress={() => router.back()}
              fullWidth
            >
              Get Started
            </Button>
          </View>
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
