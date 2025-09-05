import React, { useState } from 'react';
import { View, ScrollView, Dimensions } from 'react-native';
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
  X
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

interface MarketplaceItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  category: string;
  color: string;
}

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);

  const marketplaceItems: MarketplaceItem[] = [
    {
      id: 'electronics',
      icon: <Smartphone size={32} color="#ffffff" />,
      title: 'Electronics',
      category: 'Phones, Laptops & More',
      color: '#3B82F6',
    },
    {
      id: 'fashion',
      icon: <Shirt size={32} color="#ffffff" />,
      title: 'Fashion',
      category: 'Clothing & Accessories',
      color: '#EC4899',
    },
    {
      id: 'audio',
      icon: <Headphones size={32} color="#ffffff" />,
      title: 'Audio',
      category: 'Speakers & Headphones',
      color: '#10B981',
    },
    {
      id: 'automotive',
      icon: <Car size={32} color="#ffffff" />,
      title: 'Automotive',
      category: 'Cars & Parts',
      color: '#F59E0B',
    },
    {
      id: 'home',
      icon: <Home size={32} color="#ffffff" />,
      title: 'Home & Garden',
      category: 'Furniture & Decor',
      color: '#8B5CF6',
    },
    {
      id: 'general',
      icon: <ShoppingBag size={32} color="#ffffff" />,
      title: 'Everything Else',
      category: 'Find Anything',
      color: '#EF4444',
    },
  ];

  const handleSignUp = () => {
    setShowSignUpModal(true);
  };

  const handleSignIn = () => {
    setShowSignInModal(true);
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
    console.log('Google auth');
  };

  const handleFacebookAuth = () => {
    // TODO: Implement Facebook authentication
    console.log('Facebook auth');
  };

  return (
    <SafeAreaWrapper>
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <Container padding='sm'>
          <View style={{ flex: 1, paddingVertical: theme.spacing.xl }}>
            
            {/* Header */}
            <View style={{ 
              alignItems: 'center', 
              marginBottom: theme.spacing['3xl'],
              marginTop: theme.spacing.sm
            }}>
              <Text 
                variant="h1" 
                style={{ 
                  fontSize: 32,
                  fontWeight: '800',
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing.sm
                }}
              >
                Sellar
              </Text>
              <Text 
                variant="body" 
                color="muted"
                style={{ 
                  fontSize: 16,
                  textAlign: 'center'
                }}
              >
                Made with you in mind
              </Text>
            </View>

            {/* Marketplace Items Grid */}
            <View style={{
              marginBottom: theme.spacing['3xl'],
            }}>
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                gap: theme.spacing.md,
              }}>
                {marketplaceItems.map((item, index) => (
                  <View
                    key={item.id}
                    style={{
                      width: (screenWidth - theme.spacing.xl * 2 - theme.spacing.md * 2) / 3,
                      aspectRatio: 1,
                      backgroundColor: item.color,
                      borderRadius: theme.borderRadius.lg,
                      padding: theme.spacing.md,
                      justifyContent: 'space-between',
                      ...theme.shadows.md,
                    }}
                  >
                    <View style={{ alignItems: 'center' }}>
                      {item.icon}
                    </View>
                    <View>
                      <Text 
                        variant="bodySmall" 
                        style={{ 
                          color: '#ffffff',
                          fontWeight: '600',
                          fontSize: 12,
                          textAlign: 'center',
                          marginBottom: 2
                        }}
                      >
                        {item.title}
                      </Text>
                      <Text 
                        variant="caption" 
                        style={{ 
                          color: '#ffffff',
                          opacity: 0.8,
                          fontSize: 10,
                          textAlign: 'center',
                          lineHeight: 12
                        }}
                      >
                        {item.category}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Call to Action */}
            <View style={{
              alignItems: 'center',
              marginBottom: theme.spacing.sm,
            }}>
              <Text 
                variant="h2" 
                style={{ 
                  fontSize: 24,
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: theme.spacing.lg,
                  lineHeight: 32
                }}
              >
                Join and sell & buy items you love
              </Text>
              
              <Text 
                variant="body" 
                color="muted"
                style={{ 
                  textAlign: 'center',
                  lineHeight: 22,
                  marginBottom: theme.spacing['2xl'],
                  paddingHorizontal: theme.spacing.lg
                }}
              >
                Connect with buyers and sellers across Ghana. List your items, chat securely, and make deals with confidence.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={{ gap: theme.spacing.md }}>
              <Button
                variant="primary"
                onPress={handleSignUp}
                fullWidth
                size='lg'
                style={{
                  backgroundColor: theme.colors.primary,
                  paddingVertical: theme.spacing.md,
                }}
              >
                <Text 
                  variant="body" 
                  style={{ 
                    color: theme.colors.primaryForeground,
                    fontWeight: '600',
                    fontSize: 16
                  }}
                >
                  Sign up for Sellar
                </Text>
              </Button>

              <Button
                variant="tertiary"
                onPress={handleSignIn}
                fullWidth
                size="md"
                style={{
                  borderColor: theme.colors.primary,
                  borderWidth: 1,
                  paddingVertical: theme.spacing.md,
                }}
              >
                <Text 
                  variant="body" 
                  style={{ 
                    color: theme.colors.primary,
                    fontWeight: '600',
                    fontSize: 16
                  }}
                >
                  I already have an account
                </Text>
              </Button>
            </View>

            {/* Footer */}
            <View style={{
              alignItems: 'center',
              marginTop: theme.spacing['2xl'],
              paddingTop: theme.spacing.lg,
            }}>
              <LinkButton
                variant="muted"
                onPress={() => router.push('/(auth)/about')}
                style={{
                  paddingVertical: theme.spacing.xs,
                  paddingHorizontal: theme.spacing.sm,
                }}
              >
                <Text 
                  variant="caption" 
                  color="muted"
                  style={{ 
                    textAlign: 'center',
                    fontSize: 12,
                    lineHeight: 16
                  }}
                >
                  About Sellar: Our platform
                </Text>
              </LinkButton>
            </View>
          </View>
        </Container>
      </ScrollView>

      {/* Sign Up Modal */}
      <AppModal
        visible={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
        title="Join Sellar"
        position="bottom"
        size="lg"
        showCloseButton={true}
        dismissOnBackdrop={true}
      >
        <View style={{ padding: theme.spacing.lg }}>

          {/* Auth Options */}
          <View style={{ gap: theme.spacing.md }}>
            {/* Google Auth */}
            <Button
              variant="tertiary"
              onPress={handleGoogleAuth}
              fullWidth
              size="lg"
              style={{
                borderColor: theme.colors.border,
                borderWidth: 1,
                paddingVertical: theme.spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
              }}>
                {/* Google Icon */}
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 2,
                  backgroundColor: '#4285F4',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>G</Text>
                </View>
                <Text 
                  variant="body" 
                  style={{ 
                    color: theme.colors.text.primary,
                    fontWeight: '500',
                    fontSize: 16
                  }}
                >
                  Continue with Google
                </Text>
              </View>
            </Button>

            {/* Facebook Auth */}
            <Button
              variant="tertiary"
              onPress={handleFacebookAuth}
              fullWidth
              size="lg"
              style={{
                borderColor: theme.colors.border,
                borderWidth: 1,
                paddingVertical: theme.spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
              }}>
                {/* Facebook Icon */}
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: '#1877F2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>f</Text>
                </View>
                <Text 
                  variant="body" 
                  style={{ 
                    color: theme.colors.text.primary,
                    fontWeight: '500',
                    fontSize: 16
                  }}
                >
                  Continue with Facebook
                </Text>
              </View>
            </Button>

            {/* Divider */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginVertical: theme.spacing.lg,
            }}>
              <View style={{
                flex: 1,
                height: 1,
                backgroundColor: theme.colors.border,
              }} />
              <Text 
                variant="bodySmall" 
                color="muted"
                style={{ 
                  marginHorizontal: theme.spacing.md,
                  fontSize: 14
                }}
              >
                or
              </Text>
              <View style={{
                flex: 1,
                height: 1,
                backgroundColor: theme.colors.border,
              }} />
            </View>

            {/* Email Sign Up */}
            <Button
              variant="ghost"
              onPress={handleEmailSignUp}
              fullWidth
              size="lg"
              style={{
                paddingVertical: theme.spacing.lg,
              }}
            >
              <Text 
                variant="body" 
                style={{ 
                  color: theme.colors.primary,
                  fontWeight: '600',
                  fontSize: 16
                }}
              >
                Continue with email
              </Text>
            </Button>
          </View>

          {/* Bottom Spacer */}
          <View style={{ height: theme.spacing.lg }} />
        </View>
      </AppModal>

      {/* Sign In Modal */}
      <AppModal
        visible={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        title="Log in to Sellar"
        position="bottom"
        size="lg"
        showCloseButton={true}
        dismissOnBackdrop={true}
      >
        <View style={{ padding: theme.spacing.lg }}>

          {/* Auth Options */}
          <View style={{ gap: theme.spacing.md }}>
            {/* Google Auth */}
            <Button
              variant="tertiary"
              onPress={handleGoogleAuth}
              fullWidth
              size="lg"
              style={{
                borderColor: theme.colors.border,
                borderWidth: 1,
                paddingVertical: theme.spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
              }}>
                {/* Google Icon */}
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}>
                  <Text style={{ color: '#4285F4', fontSize: 12, fontWeight: 'bold' }}>G</Text>
                </View>
                <Text 
                  variant="body" 
                  style={{ 
                    color: theme.colors.text.primary,
                    fontWeight: '500',
                    fontSize: 16
                  }}
                >
                  Continue with Google
                </Text>
              </View>
            </Button>

            {/* Facebook Auth */}
            <Button
              variant="tertiary"
              onPress={handleFacebookAuth}
              fullWidth
              size="lg"
              style={{
                borderColor: theme.colors.border,
                borderWidth: 1,
                paddingVertical: theme.spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
              }}>
                {/* Facebook Icon */}
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: '#1877F2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>f</Text>
                </View>
                <Text 
                  variant="body" 
                  style={{ 
                    color: theme.colors.text.primary,
                    fontWeight: '500',
                    fontSize: 16
                  }}
                >
                  Continue with Facebook
                </Text>
              </View>
            </Button>

            {/* Divider */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginVertical: theme.spacing.lg,
            }}>
              <View style={{
                flex: 1,
                height: 1,
                backgroundColor: theme.colors.border,
              }} />
              <Text 
                variant="bodySmall" 
                color="muted"
                style={{ 
                  marginHorizontal: theme.spacing.md,
                  fontSize: 14
                }}
              >
                or
              </Text>
              <View style={{
                flex: 1,
                height: 1,
                backgroundColor: theme.colors.border,
              }} />
            </View>

            {/* Email Sign In */}
            <Button
              variant="ghost"
              onPress={handleEmailSignIn}
              fullWidth
              size="lg"
              style={{
                paddingVertical: theme.spacing.lg,
              }}
            >
              <Text 
                variant="body" 
                style={{ 
                  color: theme.colors.primary,
                  fontWeight: '600',
                  fontSize: 16
                }}
              >
                Continue with email
              </Text>
            </Button>
          </View>

          {/* Bottom Spacer */}
          <View style={{ height: theme.spacing.lg }} />
        </View>
      </AppModal>
    </SafeAreaWrapper>
  );
}
