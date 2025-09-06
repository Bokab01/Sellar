const { device, expect, element, by, waitFor } = require('detox');

describe('Authentication Flow E2E', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('User Registration', () => {
    it('should complete user registration flow', async () => {
      // Wait for app to load
      await helpers.waitForVisible('onboarding-screen');

      // Tap Sign Up button
      await helpers.tapElement('sign-up-button');

      // Wait for sign up screen
      await helpers.waitForVisible('sign-up-screen');

      // Fill in registration form
      await helpers.typeText('first-name-input', 'Test');
      await helpers.typeText('last-name-input', 'User');
      await helpers.typeText('email-input', `test${Date.now()}@example.com`);
      await helpers.typeText('password-input', 'TestPassword123!');
      await helpers.typeText('confirm-password-input', 'TestPassword123!');

      // Submit registration
      await helpers.tapElement('create-account-button');

      // Wait for email verification screen
      await helpers.waitForVisible('verify-email-screen');

      // Verify we're on the email verification screen
      await expect(element(by.text('Check your email'))).toBeVisible();
    });

    it('should show error for existing email', async () => {
      await helpers.waitForVisible('onboarding-screen');
      await helpers.tapElement('sign-up-button');
      await helpers.waitForVisible('sign-up-screen');

      // Use a known existing email
      await helpers.typeText('first-name-input', 'Test');
      await helpers.typeText('last-name-input', 'User');
      await helpers.typeText('email-input', 'existing@example.com');
      await helpers.typeText('password-input', 'TestPassword123!');
      await helpers.typeText('confirm-password-input', 'TestPassword123!');

      await helpers.tapElement('create-account-button');

      // Should show error message
      await helpers.waitForVisible('error-message');
      await expect(element(by.text('An account with this email already exists'))).toBeVisible();
    });

    it('should validate form fields', async () => {
      await helpers.waitForVisible('onboarding-screen');
      await helpers.tapElement('sign-up-button');
      await helpers.waitForVisible('sign-up-screen');

      // Try to submit empty form
      await helpers.tapElement('create-account-button');

      // Should show validation errors
      await expect(element(by.text('First name is required'))).toBeVisible();
      await expect(element(by.text('Email is required'))).toBeVisible();
      await expect(element(by.text('Password is required'))).toBeVisible();
    });
  });

  describe('User Sign In', () => {
    it('should complete sign in flow', async () => {
      await helpers.waitForVisible('onboarding-screen');
      await helpers.tapElement('sign-in-button');
      await helpers.waitForVisible('sign-in-screen');

      // Fill in sign in form
      await helpers.typeText('email-input', 'test@example.com');
      await helpers.typeText('password-input', 'TestPassword123!');

      await helpers.tapElement('sign-in-button');

      // Should navigate to home screen
      await helpers.waitForVisible('home-screen');
      await expect(element(by.id('home-screen'))).toBeVisible();
    });

    it('should show error for invalid credentials', async () => {
      await helpers.waitForVisible('onboarding-screen');
      await helpers.tapElement('sign-in-button');
      await helpers.waitForVisible('sign-in-screen');

      await helpers.typeText('email-input', 'test@example.com');
      await helpers.typeText('password-input', 'WrongPassword');

      await helpers.tapElement('sign-in-button');

      // Should show error
      await helpers.waitForVisible('error-message');
      await expect(element(by.text('Invalid login credentials'))).toBeVisible();
    });
  });

  describe('Navigation', () => {
    it('should navigate between sign up and sign in', async () => {
      await helpers.waitForVisible('onboarding-screen');
      
      // Go to sign up
      await helpers.tapElement('sign-up-button');
      await helpers.waitForVisible('sign-up-screen');

      // Navigate to sign in
      await helpers.tapElement('sign-in-link');
      await helpers.waitForVisible('sign-in-screen');

      // Navigate back to sign up
      await helpers.tapElement('sign-up-link');
      await helpers.waitForVisible('sign-up-screen');
    });

    it('should handle back navigation', async () => {
      await helpers.waitForVisible('onboarding-screen');
      await helpers.tapElement('sign-up-button');
      await helpers.waitForVisible('sign-up-screen');

      // Go back
      await helpers.tapElement('back-button');
      await helpers.waitForVisible('onboarding-screen');
    });
  });

  describe('About Screen', () => {
    it('should navigate to about screen', async () => {
      await helpers.waitForVisible('onboarding-screen');
      await helpers.tapElement('about-link');
      await helpers.waitForVisible('about-screen');

      // Should show platform statistics
      await expect(element(by.text('Platform Statistics'))).toBeVisible();
      await expect(element(by.id('stats-grid'))).toBeVisible();
    });

    it('should navigate back from about screen', async () => {
      await helpers.waitForVisible('onboarding-screen');
      await helpers.tapElement('about-link');
      await helpers.waitForVisible('about-screen');

      await helpers.tapElement('back-button');
      await helpers.waitForVisible('onboarding-screen');
    });
  });
});
