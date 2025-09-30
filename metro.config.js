const { getDefaultConfig } = require('expo/metro-config');
const { withSentryConfig } = require('@sentry/react-native/metro');

const config = getDefaultConfig(__dirname);

// Fix countLines error by disabling source maps
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    sourceMap: false,
    keep_fnames: true,
  },
};

// Re-enable Sentry with proper configuration for EAS builds
module.exports = withSentryConfig(config, {
  org: 'sellar-n6',
  project: 'sellar-ghana',
  // EAS will automatically use the SENTRY_AUTH_TOKEN secret
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
