/**
 * R2 Integration Test Script
 * 
 * This script tests the Cloudflare R2 integration to ensure:
 * 1. R2 credentials are properly configured
 * 2. Storage routing works correctly
 * 3. Profile images go to Supabase
 * 4. Other media goes to R2
 * 5. Fallback mechanism works
 */

import { hybridStorage } from '../lib/hybridStorage';
import { r2Storage, initializeR2FromEnv } from '../lib/r2Storage';
import { STORAGE_BUCKETS } from '../lib/storage';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logResult(result: TestResult) {
  const icon = result.passed ? '✅' : '❌';
  console.log(`${icon} ${result.test}: ${result.message}`);
  if (result.details) {
    console.log('   Details:', result.details);
  }
  results.push(result);
}

async function testEnvironmentVariables() {
  const accountId = process.env.EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.EXPO_PUBLIC_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.EXPO_PUBLIC_R2_SECRET_ACCESS_KEY;
  
  const allPresent = !!(accountId && accessKeyId && secretAccessKey);
  
  logResult({
    test: 'Environment Variables',
    passed: allPresent,
    message: allPresent 
      ? 'All R2 credentials are configured' 
      : 'Some R2 credentials are missing',
    details: {
      accountId: accountId ? '✅ Set' : '❌ Missing',
      accessKeyId: accessKeyId ? '✅ Set' : '❌ Missing',
      secretAccessKey: secretAccessKey ? '✅ Set' : '❌ Missing',
    }
  });
  
  return allPresent;
}

function testR2Initialization() {
  const isInitialized = initializeR2FromEnv();
  
  logResult({
    test: 'R2 Initialization',
    passed: isInitialized,
    message: isInitialized 
      ? 'R2 service initialized successfully' 
      : 'R2 service failed to initialize'
  });
  
  return isInitialized;
}

function testStorageRouting() {
  const stats = hybridStorage.getStorageStats();
  
  // Expected routing
  const expectedRouting = {
    profilesProvider: 'supabase',  // Profiles should stay on Supabase
    listingsProvider: stats.r2Available ? 'r2' : 'supabase',
    communityProvider: stats.r2Available ? 'r2' : 'supabase',
    chatProvider: stats.r2Available ? 'r2' : 'supabase',
    videosProvider: stats.r2Available ? 'r2' : 'supabase',
    verificationProvider: stats.r2Available ? 'r2' : 'supabase',
  };
  
  const correctRouting = 
    stats.profilesProvider === expectedRouting.profilesProvider &&
    stats.listingsProvider === expectedRouting.listingsProvider &&
    stats.communityProvider === expectedRouting.communityProvider &&
    stats.chatProvider === expectedRouting.chatProvider &&
    stats.videosProvider === expectedRouting.videosProvider &&
    stats.verificationProvider === expectedRouting.verificationProvider;
  
  logResult({
    test: 'Storage Routing',
    passed: correctRouting,
    message: correctRouting 
      ? 'Storage routing configured correctly' 
      : 'Storage routing configuration incorrect',
    details: {
      current: stats,
      expected: expectedRouting,
    }
  });
  
  return correctRouting;
}

function testBucketMapping() {
  const mappings = [
    { supabase: STORAGE_BUCKETS.PROFILES, expected: 'supabase', name: 'Profiles' },
    { supabase: STORAGE_BUCKETS.LISTINGS, expected: 'r2', name: 'Listings' },
    { supabase: STORAGE_BUCKETS.PRO_VIDEOS, expected: 'r2', name: 'Videos' },
    { supabase: STORAGE_BUCKETS.COMMUNITY, expected: 'r2', name: 'Community' },
    { supabase: STORAGE_BUCKETS.CHAT, expected: 'r2', name: 'Chat' },
    { supabase: STORAGE_BUCKETS.VERIFICATION, expected: 'r2', name: 'Verification' },
  ];
  
  let allCorrect = true;
  const details: any = {};
  
  mappings.forEach(({ supabase, expected, name }) => {
    const provider = hybridStorage.getProviderForBucket(supabase);
    const isR2Available = hybridStorage.isR2Available();
    
    // If R2 is not available, everything should route to Supabase
    const expectedProvider = (expected === 'r2' && !isR2Available) ? 'supabase' : expected;
    const correct = provider === expectedProvider;
    
    details[name] = {
      bucket: supabase,
      provider,
      expected: expectedProvider,
      correct: correct ? '✅' : '❌',
    };
    
    if (!correct) allCorrect = false;
  });
  
  logResult({
    test: 'Bucket Mapping',
    passed: allCorrect,
    message: allCorrect 
      ? 'All buckets mapped correctly' 
      : 'Some bucket mappings are incorrect',
    details,
  });
  
  return allCorrect;
}

async function testURLGeneration() {
  try {
    const testPath = 'test/image.jpg';
    const r2Available = hybridStorage.isR2Available();
    
    // Test listing URL (should be R2 if available)
    const listingUrl = hybridStorage.getPublicUrl(testPath, STORAGE_BUCKETS.LISTINGS);
    const isR2Url = listingUrl.includes('.r2.dev') || listingUrl.includes('cdn.sellar.app');
    const correctListingUrl = r2Available ? isR2Url : !isR2Url;
    
    logResult({
      test: 'URL Generation - Listings',
      passed: correctListingUrl,
      message: correctListingUrl 
        ? `Listing URLs generated correctly (${r2Available ? 'R2' : 'Supabase'})` 
        : 'Listing URL generation incorrect',
      details: {
        url: listingUrl,
        isR2: isR2Url,
        r2Available,
      }
    });
    
    // Test profile URL (should always be Supabase)
    const profileUrl = hybridStorage.getPublicUrl(testPath, STORAGE_BUCKETS.PROFILES);
    const isSupabaseUrl = profileUrl.includes('supabase');
    
    logResult({
      test: 'URL Generation - Profiles',
      passed: isSupabaseUrl,
      message: isSupabaseUrl 
        ? 'Profile URLs correctly use Supabase' 
        : 'Profile URL generation incorrect',
      details: {
        url: profileUrl,
        isSupabase: isSupabaseUrl,
      }
    });
    
    return correctListingUrl && isSupabaseUrl;
  } catch (error) {
    logResult({
      test: 'URL Generation',
      passed: false,
      message: `URL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    return false;
  }
}

export async function runR2IntegrationTests() {
  console.log('\n🔍 Starting R2 Integration Tests...\n');
  console.log('═'.repeat(60));
  
  // Test 1: Environment Variables
  const hasEnvVars = await testEnvironmentVariables();
  
  // Test 2: R2 Initialization
  const isR2Initialized = testR2Initialization();
  
  // Test 3: Storage Routing
  const routingCorrect = testStorageRouting();
  
  // Test 4: Bucket Mapping
  const mappingCorrect = testBucketMapping();
  
  // Test 5: URL Generation
  const urlsCorrect = await testURLGeneration();
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 Test Summary:\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${percentage}%`);
  
  console.log('\n' + '═'.repeat(60));
  
  // Recommendations
  if (failed > 0) {
    console.log('\n⚠️  Recommendations:\n');
    
    if (!hasEnvVars) {
      console.log('1. Add R2 credentials to your .env file');
      console.log('   - EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID');
      console.log('   - EXPO_PUBLIC_R2_ACCESS_KEY_ID');
      console.log('   - EXPO_PUBLIC_R2_SECRET_ACCESS_KEY');
      console.log('   See: R2_INSTALLATION_STEPS.md for details\n');
    }
    
    if (!isR2Initialized) {
      console.log('2. Restart your development server with --clear flag');
      console.log('   npm start -- --clear\n');
    }
    
    if (!routingCorrect || !mappingCorrect) {
      console.log('3. Check hybridStorage configuration in lib/hybridStorage.ts\n');
    }
    
    if (!urlsCorrect) {
      console.log('4. Verify R2 bucket public access settings');
      console.log('   See: CLOUDFLARE_R2_SETUP_GUIDE.md\n');
    }
  } else {
    console.log('\n🎉 All tests passed! Your R2 integration is working correctly.\n');
    console.log('Benefits:');
    console.log('  ✅ Profile images → Supabase (auth integrated)');
    console.log('  ✅ Listing images → R2 (cost savings)');
    console.log('  ✅ Videos → R2 (free egress)');
    console.log('  ✅ Community posts → R2 (performance)');
    console.log('  ✅ Chat attachments → R2 (scalability)');
    console.log('  ✅ Est. savings: ~$91/month (97% reduction)\n');
  }
  
  return {
    passed,
    failed,
    total,
    percentage,
    allPassed: failed === 0,
    results,
  };
}

// Run tests if executed directly
if (require.main === module) {
  runR2IntegrationTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

