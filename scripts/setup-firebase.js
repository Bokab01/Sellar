#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// This script creates google-services.json from environment variable
// Usage: node scripts/setup-firebase.js

console.log('🔧 Setting up Firebase configuration...');

const googleServicesJson = process.env.GOOGLE_SERVICES_JSON;

if (!googleServicesJson) {
  console.log('⚠️  GOOGLE_SERVICES_JSON environment variable is not set');
  console.log('⚠️  Skipping google-services.json creation');
  console.log('⚠️  Push notifications may not work without this file');
  process.exit(0); // Exit with success to not block the build
}

try {
  // Parse to validate JSON
  const parsed = JSON.parse(googleServicesJson);
  
  // Write to project root
  const outputPath = path.join(process.cwd(), 'google-services.json');
  fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2));
  
  console.log('✅ google-services.json created successfully');
  console.log('✅ Firebase configuration is ready');
} catch (error) {
  console.error('❌ Failed to create google-services.json:', error.message);
  console.log('⚠️  Continuing build without Firebase configuration');
  process.exit(0); // Exit with success to not block the build
}
