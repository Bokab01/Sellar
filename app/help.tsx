import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  ListItem,
  Button,
  Badge,
  Input,
  AppModal,
  Toast,
} from '@/components';
import { 
  CircleHelp as HelpCircle, 
  MessageCircle, 
  Phone, 
  Mail, 
  FileText, 
  Shield,
  CreditCard,
  Package,
  Users,
  Settings,
  ExternalLink,
  Send,
  Headphones
} from 'lucide-react-native';

export default function HelpScreen() {
  const { theme } = useTheme();
  const { hasPrioritySupport } = useMonetizationStore();
  
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const faqSections = [
    {
      title: 'Getting Started',
      items: [
        {
          question: 'How do I create my first listing?',
          answer: 'Tap the + button in the center of the bottom navigation, then follow the step-by-step guide to add photos, description, price, and other details.',
        },
        {
          question: 'How do I buy credits?',
          answer: 'Go to More > Buy Credits to purchase credit packages. Credits are used for premium features like boosting listings and unlocking business tools.',
        },
        {
          question: 'What are the listing limits?',
          answer: 'You can create 5 free active listings. Additional listings cost 10 credits each, or upgrade to a Business Plan for unlimited listings.',
        },
      ],
    },
    {
      title: 'Buying & Selling',
      items: [
        {
          question: 'How do offers work?',
          answer: 'Buyers can make offers on listings that accept them. You can accept, reject, or counter the offer directly in the chat conversation.',
        },
        {
          question: 'How do I contact a seller?',
          answer: 'Tap "Message" on any listing to start a conversation. You can also request a callback if the seller has provided their phone number.',
        },
        {
          question: 'Is it safe to buy and sell on Sellar?',
          answer: 'We have verification systems, user ratings, and reporting tools to keep the community safe. Always meet in public places for transactions.',
        },
      ],
    },
    {
      title: 'Credits & Sellar Pro Plans',
      items: [
        {
          question: 'What can I do with credits?',
          answer: 'Credits unlock premium features like boosting listings for better visibility, creating additional listings beyond the free limit, and accessing business tools.',
        },
        {
          question: 'What are Sellar Pro Plans?',
          answer: 'Monthly subscriptions that include auto-refresh every 2 hours, unlimited listings, pro badges, analytics, and priority support for serious and even business sellers.',
        },
        {
          question: 'Can I get a refund?',
          answer: 'Credits are non-refundable, but subscription plans can be cancelled anytime. You keep access until the end of your billing period.',
        },
      ],
    },
    {
      title: 'Account & Privacy',
      items: [
        {
          question: 'How do I verify my account?',
          answer: 'Go to More > Settings > Verification to submit your ID and phone number for verification. Verified accounts get a badge and increased trust.',
        },
        {
          question: 'Can I control who sees my phone number?',
          answer: 'Yes! In Settings > Privacy, you can set your phone visibility to Public, Contacts Only, or Private.',
        },
        {
          question: 'How do I report inappropriate content?',
          answer: 'Use the report button (flag icon) on any listing, post, or message. Our moderation team reviews all reports promptly.',
        },
      ],
    },
  ];

  const contactOptions = [
    {
      title: 'Priority Support',
      subtitle: hasPrioritySupport() ? 'WhatsApp Business • Response within 2 hours' : 'Upgrade to get priority support',
      icon: <Headphones size={20} color={hasPrioritySupport() ? theme.colors.success : theme.colors.text.muted} />,
      badge: hasPrioritySupport() ? { text: 'Active', variant: 'success' as const } : { text: 'Upgrade', variant: 'warning' as const },
      onPress: () => {
        if (hasPrioritySupport()) {
          Linking.openURL('https://wa.me/233244857777?text=Hello, I need help with my Sellar account');
        } else {
          Alert.alert(
            'Priority Support',
            'Get fast-track support with WhatsApp Business access and 2-hour response guarantee.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Upgrade', onPress: () => router.push('/subscription-plans') },
            ]
          );
        }
      },
    },
    {
      title: 'Support Tickets',
      subtitle: 'Create and track support requests',
      icon: <MessageCircle size={20} color={theme.colors.text.primary} />,
      onPress: () => router.push('/support-tickets'),
    },
    {
      title: 'Knowledge Base',
      subtitle: 'Browse help articles and guides',
      icon: <FileText size={20} color={theme.colors.text.primary} />,
      onPress: () => router.push('/knowledge-base'),
    },
    {
      title: 'Community Help',
      subtitle: 'Ask questions in the community',
      icon: <Users size={20} color={theme.colors.text.primary} />,
      onPress: () => router.push('/(tabs)/community'),
    },
  ];

  const quickLinks = [
    {
      title: 'Terms of Service',
      icon: <FileText size={20} color={theme.colors.text.primary} />,
      onPress: () => router.push('/terms-of-service'),
    },
    {
      title: 'Privacy Policy',
      icon: <Shield size={20} color={theme.colors.text.primary} />,
      onPress: () => router.push('/privacy-policy'),
    },
    {
      title: 'Safety Guidelines',
      icon: <Shield size={20} color={theme.colors.text.primary} />,
      onPress: () => router.push('/safety-guidelines'),
    },
  ];

  const handleSendMessage = async () => {
    if (!contactSubject.trim() || !contactMessage.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setSendingMessage(true);
    try {
      // TODO: Implement actual support ticket creation
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      setShowContactModal(false);
      setContactSubject('');
      setContactMessage('');
      setToastMessage('Support request sent! We\'ll respond within 24 hours.');
      setShowToast(true);
    } catch {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Help & Support"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        <Container>
          {/* Contact Options */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
              Get Help
            </Text>

            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: theme.colors.border,
                ...theme.shadows.sm,
              }}
            >
              {contactOptions.map((option, index) => (
                <ListItem
                  key={option.title}
                  title={option.title}
                  description={option.subtitle}
                  rightIcon={option.icon}
                  badge={option.badge}
                  showChevron
                  onPress={option.onPress}
                  style={{
                    borderBottomWidth: index < contactOptions.length - 1 ? 1 : 0,
                    paddingVertical: theme.spacing.lg,
                  }}
                />
              ))}
            </View>
          </View>

          {/* FAQ Sections */}
          {faqSections.map((section) => (
            <View key={section.title} style={{ marginBottom: theme.spacing.xl }}>
              <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
                {section.title}
              </Text>

              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  ...theme.shadows.sm,
                }}
              >
                {section.items.map((item, index) => (
                  <View
                    key={index}
                    style={{
                      padding: theme.spacing.lg,
                      borderBottomWidth: index < section.items.length - 1 ? 1 : 0,
                      borderBottomColor: theme.colors.border,
                    }}
                  >
                    <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.md }}>
                      {item.question}
                    </Text>
                    <Text variant="bodySmall" color="secondary" style={{ lineHeight: 20 }}>
                      {item.answer}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Quick Links */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
              Legal & Safety
            </Text>

            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: theme.colors.border,
                ...theme.shadows.sm,
              }}
            >
              {quickLinks.map((link, index) => (
                <ListItem
                  key={link.title}
                  title={link.title}
                  rightIcon={<ExternalLink size={16} color={theme.colors.text.muted} />}
                  showChevron={false}
                  onPress={link.onPress}
                  style={{
                    borderBottomWidth: index < quickLinks.length - 1 ? 1 : 0,
                    paddingVertical: theme.spacing.lg,
                  }}
                />
              ))}
            </View>
          </View>

          {/* App Info */}
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.lg,
              alignItems: 'center',
            }}
          >
            <Text variant="caption" color="muted" style={{ textAlign: 'center', marginBottom: theme.spacing.sm }}>
              Sellar v1.0.0 • Made with ❤️ in Ghana
            </Text>
            <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
              Ghana&apos;s premier marketplace for buying and selling
            </Text>
          </View>
        </Container>
      </ScrollView>

      {/* Contact Modal */}
      <AppModal
        visible={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Contact Support"
        primaryAction={{
          text: 'Send Message',
          onPress: handleSendMessage,
          loading: sendingMessage,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setShowContactModal(false),
        }}
      >
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="body" color="secondary">
            Describe your issue and we&apos;ll get back to you within 24 hours.
          </Text>

          <Input
            label="Subject"
            placeholder="What do you need help with?"
            value={contactSubject}
            onChangeText={setContactSubject}
          />

          <Input
            variant="multiline"
            label="Message"
            placeholder="Please describe your issue in detail..."
            value={contactMessage}
            onChangeText={setContactMessage}
            style={{ minHeight: 120 }}
          />

          <View
            style={{
              backgroundColor: theme.colors.primary + '10',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
            }}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.primary, textAlign: 'center' }}>
              📧 We&apos;ll respond to your registered email address
            </Text>
          </View>
        </View>
      </AppModal>

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
