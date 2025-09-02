import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useKeyboard, useKeyboardSpacing, useAvailableScreenHeight } from '@/hooks/useKeyboard';
import {
  Text,
  SafeAreaWrapper,
  Container,
  Input,
  Button,
} from '@/components';
import { KeyboardAwareScrollView, CustomKeyboardAvoidingView } from './';
import { Mail, Lock, User, Phone } from 'lucide-react-native';

/**
 * Example component demonstrating different keyboard avoiding approaches
 */
export function KeyboardAvoidingExample() {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    bio: '',
  });
  const [approachType, setApproachType] = useState<'scroll' | 'padding' | 'height'>('scroll');

  // Keyboard hooks for display
  const keyboardInfo = useKeyboard();
  const { availableHeight, keyboardHeight } = useAvailableScreenHeight();
  const { spacing } = useKeyboardSpacing(20, 40);

  const handleSubmit = () => {
    Alert.alert('Form Submitted', JSON.stringify(formData, null, 2));
  };

  const renderForm = () => (
    <View style={{ gap: theme.spacing.lg }}>
      {/* Keyboard Info Display */}
      <View
        style={{
          backgroundColor: theme.colors.surfaceVariant,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          marginBottom: theme.spacing.lg,
        }}
      >
        <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
          Keyboard Status:
        </Text>
        <Text variant="caption" color="secondary">
          Visible: {keyboardInfo.isVisible ? 'Yes' : 'No'}
        </Text>
        <Text variant="caption" color="secondary">
          Height: {keyboardHeight}px
        </Text>
        <Text variant="caption" color="secondary">
          Available Height: {availableHeight}px
        </Text>
        <Text variant="caption" color="secondary">
          Dynamic Spacing: {spacing}px
        </Text>
      </View>

      {/* Approach Selector */}
      <View style={{ marginBottom: theme.spacing.lg }}>
        <Text variant="bodySmall" style={{ marginBottom: theme.spacing.sm }}>
          Keyboard Avoiding Approach:
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {(['scroll', 'padding', 'height'] as const).map((approach) => (
            <Button
              key={approach}
              variant={approachType === approach ? 'primary' : 'secondary'}
              onPress={() => setApproachType(approach)}
              size="sm"
            >
              {approach.charAt(0).toUpperCase() + approach.slice(1)}
            </Button>
          ))}
        </View>
      </View>

      {/* Form Fields */}
      <Input
        label="Full Name"
        placeholder="Enter your full name"
        value={formData.name}
        onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
        leftIcon={<User size={20} color={theme.colors.text.muted} />}
      />

      <Input
        label="Email Address"
        placeholder="Enter your email"
        value={formData.email}
        onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
        keyboardType="email-address"
        autoCapitalize="none"
        leftIcon={<Mail size={20} color={theme.colors.text.muted} />}
      />

      <Input
        label="Phone Number"
        placeholder="Enter your phone number"
        value={formData.phone}
        onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
        keyboardType="phone-pad"
        leftIcon={<Phone size={20} color={theme.colors.text.muted} />}
      />

      <Input
        variant="password"
        label="Password"
        placeholder="Create a secure password"
        value={formData.password}
        onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
        leftIcon={<Lock size={20} color={theme.colors.text.muted} />}
      />

      <Input
        label="Bio"
        placeholder="Tell us about yourself..."
        value={formData.bio}
        onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
        multiline
        numberOfLines={4}
        style={{ minHeight: 100 }}
      />

      {/* Submit Button */}
      <Button
        variant="primary"
        onPress={handleSubmit}
        fullWidth
        size="lg"
        style={{ marginTop: theme.spacing.lg }}
      >
        Submit Form
      </Button>

      {/* Spacer for demonstration */}
      <View style={{ height: 200, backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.borderRadius.md, justifyContent: 'center', alignItems: 'center' }}>
        <Text variant="body" color="secondary">
          Extra content to test scrolling
        </Text>
      </View>
    </View>
  );

  if (approachType === 'scroll') {
    return (
      <SafeAreaWrapper>
        <KeyboardAwareScrollView
          extraScrollHeight={100}
          enableResetScrollToCoords={true}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          onKeyboardShow={(height) => console.log('Keyboard shown:', height)}
          onKeyboardHide={() => console.log('Keyboard hidden')}
        >
          <Container>
            <View style={{ paddingVertical: theme.spacing.xl }}>
              <Text variant="h2" style={{ marginBottom: theme.spacing.xl, textAlign: 'center' }}>
                Keyboard Aware ScrollView
              </Text>
              {renderForm()}
            </View>
          </Container>
        </KeyboardAwareScrollView>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <CustomKeyboardAvoidingView
        behavior={approachType}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
        onKeyboardShow={(height) => console.log('Keyboard shown:', height)}
        onKeyboardHide={() => console.log('Keyboard hidden')}
      >
        <Container>
          <View style={{ flex: 1, paddingVertical: theme.spacing.xl }}>
            <Text variant="h2" style={{ marginBottom: theme.spacing.xl, textAlign: 'center' }}>
              Custom Keyboard Avoiding ({approachType})
            </Text>
            {renderForm()}
          </View>
        </Container>
      </CustomKeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}

/**
 * Minimal example for quick integration
 */
export function SimpleKeyboardAvoidingForm() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaWrapper>
      <KeyboardAwareScrollView
        extraScrollHeight={50}
        keyboardShouldPersistTaps="handled"
      >
        <Container>
          <View style={{ paddingVertical: theme.spacing.xl, gap: theme.spacing.lg }}>
            <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.xl }}>
              Simple Form
            </Text>
            
            <Input
              label="Email"
              placeholder="Enter email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            
            <Input
              variant="password"
              label="Password"
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
            />
            
            <Button variant="primary" fullWidth>
              Sign In
            </Button>
          </View>
        </Container>
      </KeyboardAwareScrollView>
    </SafeAreaWrapper>
  );
}


