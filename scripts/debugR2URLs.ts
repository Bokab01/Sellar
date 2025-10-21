/**
 * R2 URL Debug Script
 * 
 * This script helps diagnose why R2 images aren't displaying
 */

import { r2Storage, initializeR2FromEnv } from '../lib/r2Storage';
import { hybridStorage } from '../lib/hybridStorage';
import { STORAGE_BUCKETS } from '../lib/storage';

async function debugR2Setup() {
  console.log('\n🔍 R2 Configuration Debugger\n');
  console.log('═'.repeat(70));
  
  // Check environment variables
  console.log('\n1️⃣ Checking Environment Variables:\n');
  
  const envVars = {
    'EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID': process.env.EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID,
    'EXPO_PUBLIC_R2_ACCESS_KEY_ID': process.env.EXPO_PUBLIC_R2_ACCESS_KEY_ID,
    'EXPO_PUBLIC_R2_SECRET_ACCESS_KEY': process.env.EXPO_PUBLIC_R2_SECRET_ACCESS_KEY,
    'EXPO_PUBLIC_R2_PUBLIC_URL': process.env.EXPO_PUBLIC_R2_PUBLIC_URL,
    'EXPO_PUBLIC_R2_LISTINGS_URL': process.env.EXPO_PUBLIC_R2_LISTINGS_URL,
    'EXPO_PUBLIC_R2_VIDEOS_URL': process.env.EXPO_PUBLIC_R2_VIDEOS_URL,
    'EXPO_PUBLIC_R2_COMMUNITY_URL': process.env.EXPO_PUBLIC_R2_COMMUNITY_URL,
    'EXPO_PUBLIC_R2_CHAT_URL': process.env.EXPO_PUBLIC_R2_CHAT_URL,
  };
  
  let hasCredentials = true;
  let hasPublicUrls = false;
  
  Object.entries(envVars).forEach(([key, value]) => {
    if (value) {
      // Mask sensitive values
      if (key.includes('SECRET') || key.includes('KEY_ID')) {
        console.log(`   ✅ ${key}: ${value.substring(0, 8)}...${value.substring(value.length - 4)}`);
      } else {
        console.log(`   ✅ ${key}: ${value}`);
        if (key.includes('URL')) {
          hasPublicUrls = true;
        }
      }
    } else {
      console.log(`   ❌ ${key}: NOT SET`);
      if (key.includes('ACCOUNT') || key.includes('KEY')) {
        hasCredentials = false;
      }
    }
  });
  
  // Check R2 initialization
  console.log('\n2️⃣ Checking R2 Initialization:\n');
  
  const isInitialized = initializeR2FromEnv();
  console.log(`   ${isInitialized ? '✅' : '❌'} R2 Service: ${isInitialized ? 'Initialized' : 'Not Initialized'}`);
  
  if (!isInitialized) {
    console.log('\n❌ R2 is not initialized!\n');
    console.log('Required environment variables:');
    console.log('   - EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID');
    console.log('   - EXPO_PUBLIC_R2_ACCESS_KEY_ID');
    console.log('   - EXPO_PUBLIC_R2_SECRET_ACCESS_KEY\n');
    return;
  }
  
  // Check storage routing
  console.log('\n3️⃣ Checking Storage Routing:\n');
  
  const stats = hybridStorage.getStorageStats();
  console.log(`   R2 Available: ${stats.r2Available ? '✅ Yes' : '❌ No'}`);
  console.log(`   Profiles:     ${stats.profilesProvider} ${stats.profilesProvider === 'supabase' ? '✅' : '⚠️'}`);
  console.log(`   Listings:     ${stats.listingsProvider} ${stats.listingsProvider === 'r2' ? '✅' : '❌'}`);
  console.log(`   Community:    ${stats.communityProvider} ${stats.communityProvider === 'r2' ? '✅' : '❌'}`);
  console.log(`   Chat:         ${stats.chatProvider} ${stats.chatProvider === 'r2' ? '✅' : '❌'}`);
  console.log(`   Videos:       ${stats.videosProvider} ${stats.videosProvider === 'supabase' ? '✅' : '⚠️'}`);
  
  // Test URL generation
  console.log('\n4️⃣ Testing URL Generation:\n');
  
  const testPath = 'listing/user123/1234567_test.jpg';
  
  try {
    const listingsUrl = r2Storage.getPublicUrl('media-listings', testPath);
    console.log(`   Listings URL: ${listingsUrl}`);
    
    const videosUrl = r2Storage.getPublicUrl('media-videos', 'test.mp4');
    console.log(`   Videos URL:   ${videosUrl}`);
    
    const communityUrl = r2Storage.getPublicUrl('media-community', 'posts/test.jpg');
    console.log(`   Community URL: ${communityUrl}`);
    
    const chatUrl = r2Storage.getPublicUrl('chat-attachments', 'chat/test.jpg');
    console.log(`   Chat URL:     ${chatUrl}`);
  } catch (error) {
    console.log(`   ❌ Error generating URLs: ${error}`);
  }
  
  // Diagnosis
  console.log('\n5️⃣ Diagnosis:\n');
  
  if (!hasCredentials) {
    console.log('   ❌ PROBLEM: R2 credentials are missing');
    console.log('   📝 Solution: Add R2 credentials to .env file\n');
  } else if (!hasPublicUrls) {
    console.log('   ⚠️  PROBLEM: No bucket public URLs configured');
    console.log('   📝 Solution: Add bucket public URLs to .env file');
    console.log('');
    console.log('   Option A: Add individual bucket URLs (recommended):');
    console.log('      EXPO_PUBLIC_R2_LISTINGS_URL=https://pub-xxx.r2.dev');
    console.log('      EXPO_PUBLIC_R2_VIDEOS_URL=https://pub-yyy.r2.dev');
    console.log('      EXPO_PUBLIC_R2_COMMUNITY_URL=https://pub-zzz.r2.dev');
    console.log('      EXPO_PUBLIC_R2_CHAT_URL=https://pub-www.r2.dev\n');
    console.log('   Option B: Use global CDN URL:');
    console.log('      EXPO_PUBLIC_R2_PUBLIC_URL=https://cdn.sellar.app\n');
  } else {
    console.log('   ✅ Configuration looks good!');
    console.log('');
    console.log('   If images still don\'t load, check:');
    console.log('   1. Public access is enabled on R2 buckets');
    console.log('   2. CORS is configured on R2 buckets');
    console.log('   3. Test URLs directly in browser');
    console.log('   4. Check browser/app console for errors\n');
  }
  
  // Next steps
  console.log('═'.repeat(70));
  console.log('\n📋 Next Steps:\n');
  
  if (!hasPublicUrls) {
    console.log('1. Go to Cloudflare Dashboard → R2');
    console.log('2. For each bucket (media-listings, media-videos, etc.):');
    console.log('   - Click on bucket');
    console.log('   - Go to Settings → Public Access');
    console.log('   - Click "Allow Access"');
    console.log('   - Copy the public URL (e.g., https://pub-xxx.r2.dev)');
    console.log('3. Add all URLs to your .env file');
    console.log('4. Add CORS policy to each bucket');
    console.log('5. Restart app: npm start -- --clear\n');
  } else {
    console.log('1. Verify public access is enabled on all buckets');
    console.log('2. Verify CORS is configured on all buckets');
    console.log('3. Upload a new image and test');
    console.log('4. Copy the generated URL and test in browser');
    console.log('5. Check console for any error messages\n');
  }
  
  console.log('📖 See R2_PUBLIC_URL_SETUP.md for detailed instructions\n');
}

// Run debug
if (require.main === module) {
  debugR2Setup()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Debug failed:', error);
      process.exit(1);
    });
}

export { debugR2Setup };


