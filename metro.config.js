const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix countLines error by disabling source maps
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    sourceMap: false,
    keep_fnames: true,
  },
};

// Export the config without Sentry wrapper
// Sentry is handled by the Expo plugin in app.json
module.exports = config;
