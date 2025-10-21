/**
 * R2 Upload Test Script
 * 
 * Quick test to verify R2 uploads are working and URLs are accessible
 */

import { hybridStorage } from '../lib/hybridStorage';
import { STORAGE_BUCKETS } from '../lib/storage';

async function testR2Upload() {
  console.log('\n🧪 Testing R2 Upload & URL Generation...\n');
  console.log('═'.repeat(60));
  
  try {
    // Check R2 availability
    const isR2Available = hybridStorage.isR2Available();
    console.log(`\n📊 R2 Status: ${isR2Available ? '✅ Available' : '❌ Not configured'}\n`);
    
    if (!isR2Available) {
      console.log('⚠️  R2 is not configured. Add these to your .env file:');
      console.log('   EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID=your_account_id');
      console.log('   EXPO_PUBLIC_R2_ACCESS_KEY_ID=your_access_key');
      console.log('   EXPO_PUBLIC_R2_SECRET_ACCESS_KEY=your_secret_key\n');
      return;
    }
    
    // Show storage routing
    const stats = hybridStorage.getStorageStats();
    console.log('📁 Storage Routing:\n');
    console.log(`   Profiles:       ${stats.profilesProvider} ✓`);
    console.log(`   Listings:       ${stats.listingsProvider}`);
    console.log(`   Community:      ${stats.communityProvider}`);
    console.log(`   Chat:           ${stats.chatProvider}`);
    console.log(`   Videos:         ${stats.videosProvider}`);
    console.log(`   Verification:   ${stats.verificationProvider}`);
    
    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Configuration looks good!\n');
    
    console.log('📝 Next Steps:\n');
    console.log('1. Enable public access on R2 buckets:');
    console.log('   - Go to Cloudflare Dashboard → R2');
    console.log('   - For each bucket: media-listings, media-videos,');
    console.log('     media-community, chat-attachments');
    console.log('   - Settings → Public Access → "Allow Access"\n');
    
    console.log('2. Add CORS policy to each public bucket:');
    console.log('   {');
    console.log('     "AllowedOrigins": ["*"],');
    console.log('     "AllowedMethods": ["GET", "HEAD"],');
    console.log('     "AllowedHeaders": ["*"],');
    console.log('     "MaxAgeSeconds": 3600');
    console.log('   }\n');
    
    console.log('3. Add public URL to .env:');
    console.log('   EXPO_PUBLIC_R2_PUBLIC_URL=https://pub-YOUR_ACCOUNT_ID.r2.dev\n');
    
    console.log('4. Restart app:');
    console.log('   npm start -- --clear\n');
    
    console.log('📖 See R2_CORS_SETUP_GUIDE.md for detailed instructions\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n💡 Make sure you have:');
    console.log('   1. R2 credentials in .env');
    console.log('   2. Dependencies installed (npm install)');
    console.log('   3. App restarted after .env changes\n');
  }
}

// Run test
if (require.main === module) {
  testR2Upload()
    .then(() => {
      console.log('═'.repeat(60) + '\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testR2Upload };

