import React, { useState } from 'react';
import { View, ScrollView, Share, Linking, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  Button,
  Badge,
  Avatar,
  PriceDisplay,
  Toast,
} from '@/components';
import { 
  UserPlus2, 
  Share2, 
  MessageCircle, 
  Copy, 
  Gift,
  Users,
  DollarSign,
  ExternalLink
} from 'lucide-react-native';

export default function InviteScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Mock data - TODO: Get from backend
  const inviteStats = {
    totalInvites: 12,
    successfulInvites: 8,
    pendingInvites: 4,
    totalEarned: 80.00,
  };

  const referralCode = user?.id?.slice(-8).toUpperCase() || 'SELLAR123';
  const inviteLink = `https://sellar.gh/join?ref=${referralCode}`;
  const inviteMessage = `Hey! I've been using Sellar to buy and sell in Ghana and it's amazing! 🇬🇭\n\nJoin me and get started with free credits: ${inviteLink}\n\nUse my code: ${referralCode}`;

  const handleCopyLink = async () => {
    try {
      // TODO: Implement clipboard copy
      setToastMessage('Invite link copied to clipboard!');
      setShowToast(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleCopyCode = async () => {
    try {
      // TODO: Implement clipboard copy
      setToastMessage('Referral code copied!');
      setShowToast(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy code');
    }
  };

  const handleShareViaApp = async (platform: string) => {
    try {
      switch (platform) {
        case 'whatsapp':
          await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(inviteMessage)}`);
          break;
        case 'sms':
          await Linking.openURL(`sms:?body=${encodeURIComponent(inviteMessage)}`);
          break;
        case 'native':
          await Share.share({
            message: inviteMessage,
            title: 'Join me on Sellar!',
          });
          break;
        default:
          await Share.share({
            message: inviteMessage,
            title: 'Join me on Sellar!',
          });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share invite');
    }
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Invite Friends"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        <Container>
          {/* Reward Banner */}
          <View
            style={{
              backgroundColor: theme.colors.success,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.xl,
              marginBottom: theme.spacing.xl,
              alignItems: 'center',
              ...theme.shadows.lg,
            }}
          >
            <Text style={{ fontSize: 48, marginBottom: theme.spacing.md }}>🎁</Text>
            <Text
              variant="h2"
              style={{
                color: theme.colors.successForeground,
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: theme.spacing.sm,
              }}
            >
              Earn GHS 10
            </Text>
            <Text
              variant="body"
              style={{
                color: theme.colors.successForeground + 'DD',
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              For each friend who joins and makes their first sale
            </Text>
          </View>

          {/* Your Stats */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.xl,
              borderWidth: 1,
              borderColor: theme.colors.border,
              ...theme.shadows.sm,
            }}
          >
            <Text variant="h3" style={{ marginBottom: theme.spacing.lg, textAlign: 'center' }}>
              Your Referral Stats
            </Text>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                paddingVertical: theme.spacing.lg,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: theme.colors.border,
                marginBottom: theme.spacing.lg,
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <Text variant="h3" style={{ fontWeight: '700', color: theme.colors.primary }}>
                  {inviteStats.totalInvites}
                </Text>
                <Text variant="caption" color="muted">
                  Total Invites
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text variant="h3" style={{ fontWeight: '700', color: theme.colors.success }}>
                  {inviteStats.successfulInvites}
                </Text>
                <Text variant="caption" color="muted">
                  Successful
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text variant="h3" style={{ fontWeight: '700', color: theme.colors.warning }}>
                  {inviteStats.pendingInvites}
                </Text>
                <Text variant="caption" color="muted">
                  Pending
                </Text>
              </View>
            </View>

            <View style={{ alignItems: 'center' }}>
              <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
                Total Earned
              </Text>
              <PriceDisplay
                amount={inviteStats.totalEarned}
                size="lg"
                currency="GHS"
              />
            </View>
          </View>

          {/* Referral Code */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.xl,
              borderWidth: 1,
              borderColor: theme.colors.border,
              ...theme.shadows.sm,
            }}
          >
            <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
              Your Referral Code
            </Text>

            <View
              style={{
                backgroundColor: theme.colors.primary + '10',
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.lg,
                marginBottom: theme.spacing.lg,
                alignItems: 'center',
              }}
            >
              <Text
                variant="h2"
                style={{
                  color: theme.colors.primary,
                  fontWeight: '700',
                  letterSpacing: 2,
                  marginBottom: theme.spacing.sm,
                }}
              >
                {referralCode}
              </Text>
              <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center' }}>
                Share this code with friends to earn rewards
              </Text>
            </View>

            <Button
              variant="secondary"
              icon={<Copy size={18} color={theme.colors.primary} />}
              onPress={handleCopyCode}
              fullWidth
            >
              Copy Referral Code
            </Button>
          </View>

          {/* Share Options */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
              Share Sellar
            </Text>

            <View style={{ gap: theme.spacing.md }}>
              <Button
                variant="primary"
                icon={<MessageCircle size={18} color={theme.colors.primaryForeground} />}
                onPress={() => handleShareViaApp('whatsapp')}
                fullWidth
                size="lg"
              >
                Share via WhatsApp
              </Button>

              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <Button
                  variant="secondary"
                  icon={<MessageCircle size={18} color={theme.colors.primary} />}
                  onPress={() => handleShareViaApp('sms')}
                  style={{ flex: 1 }}
                >
                  SMS
                </Button>

                <Button
                  variant="secondary"
                  icon={<Share2 size={18} color={theme.colors.primary} />}
                  onPress={() => handleShareViaApp('native')}
                  style={{ flex: 1 }}
                >
                  More Apps
                </Button>
              </View>

              <Button
                variant="tertiary"
                icon={<Copy size={18} color={theme.colors.primary} />}
                onPress={handleCopyLink}
                fullWidth
              >
                Copy Invite Link
              </Button>
            </View>
          </View>

          {/* How It Works */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
              How It Works
            </Text>

            <View style={{ gap: theme.spacing.lg }}>
              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <View
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderRadius: theme.borderRadius.full,
                    width: 32,
                    height: 32,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: theme.colors.primaryForeground, fontWeight: '700' }}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                    Share your code
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    Send your referral code or link to friends and family
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <View
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderRadius: theme.borderRadius.full,
                    width: 32,
                    height: 32,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: theme.colors.primaryForeground, fontWeight: '700' }}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                    They join Sellar
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    Your friends sign up using your referral code
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <View
                  style={{
                    backgroundColor: theme.colors.success,
                    borderRadius: theme.borderRadius.full,
                    width: 32,
                    height: 32,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: theme.colors.successForeground, fontWeight: '700' }}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                    You both earn rewards
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    Get GHS 10 when they make their first sale, they get 20 free credits
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Container>
      </ScrollView>

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        variant="success"
        onHide={() => setShowToast(false)}
      />
    </SafeAreaWrapper>
  );
}
