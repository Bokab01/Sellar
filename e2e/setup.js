const { device, expect, element, by, waitFor } = require('detox');

beforeAll(async () => {
  await device.launchApp();
});

beforeEach(async () => {
  await device.reloadReactNative();
});

// Helper functions for E2E tests
global.helpers = {
  // Wait for element to be visible
  waitForVisible: async (testID, timeout = 10000) => {
    await waitFor(element(by.id(testID)))
      .toBeVisible()
      .withTimeout(timeout);
  },

  // Tap element by test ID
  tapElement: async (testID) => {
    await element(by.id(testID)).tap();
  },

  // Type text in input
  typeText: async (testID, text) => {
    await element(by.id(testID)).typeText(text);
  },

  // Clear text and type new text
  replaceText: async (testID, text) => {
    await element(by.id(testID)).replaceText(text);
  },

  // Scroll to element
  scrollToElement: async (scrollViewTestID, elementTestID) => {
    await element(by.id(scrollViewTestID)).scrollTo('bottom');
    await waitFor(element(by.id(elementTestID)))
      .toBeVisible()
      .whileElement(by.id(scrollViewTestID))
      .scroll(50, 'down');
  },

  // Wait for loading to complete
  waitForLoadingToComplete: async (loadingTestID = 'loading-indicator') => {
    await waitFor(element(by.id(loadingTestID)))
      .not.toBeVisible()
      .withTimeout(15000);
  },

  // Take screenshot
  takeScreenshot: async (name) => {
    await device.takeScreenshot(name);
  },

  // Navigate back
  goBack: async () => {
    await device.pressBack(); // Android
    // For iOS, you might need to tap a back button
  },
};
