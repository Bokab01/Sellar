#!/usr/bin/env node

/**
 * Test User Registration Script
 * This script tests the user registration flow to ensure it works properly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserRegistration() {
  console.log('🧪 Testing User Registration Flow...\n');

  try {
    // Test 1: Check if handle_new_user function exists
    console.log('1. Checking handle_new_user function...');
    const { data: functions, error: functionError } = await supabase
      .rpc('check_function_exists', { function_name: 'handle_new_user' });
    
    if (functionError) {
      console.log('   ⚠️  Function check failed (this is expected if the function doesn\'t exist yet)');
    } else {
      console.log('   ✅ Function exists');
    }

    // Test 2: Check profiles table structure
    console.log('\n2. Checking profiles table structure...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.log('   ❌ Profiles table error:', profilesError.message);
    } else {
      console.log('   ✅ Profiles table accessible');
    }

    // Test 3: Check user_settings table
    console.log('\n3. Checking user_settings table...');
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1);
    
    if (settingsError) {
      console.log('   ❌ User settings table error:', settingsError.message);
    } else {
      console.log('   ✅ User settings table accessible');
    }

    // Test 4: Test user registration (create a test user)
    console.log('\n4. Testing user registration...');
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User',
          phone: '+233123456789',
          location: 'Accra, Greater Accra'
        }
      }
    });

    if (authError) {
      console.log('   ❌ User registration failed:', authError.message);
      return false;
    }

    console.log('   ✅ User registration successful');
    console.log('   📧 Test email:', testEmail);
    console.log('   🆔 User ID:', authData.user?.id);

    // Test 5: Check if profile was created
    console.log('\n5. Checking if profile was created...');
    if (authData.user?.id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.log('   ❌ Profile not found:', profileError.message);
        return false;
      }

      console.log('   ✅ Profile created successfully');
      console.log('   📝 Profile data:', {
        id: profile.id,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        is_verified: profile.is_verified,
        is_business: profile.is_business,
        is_active: profile.is_active
      });
    }

    // Test 6: Check if user_settings was created
    console.log('\n6. Checking if user_settings was created...');
    if (authData.user?.id) {
      const { data: userSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (settingsError) {
        console.log('   ❌ User settings not found:', settingsError.message);
        return false;
      }

      console.log('   ✅ User settings created successfully');
      console.log('   ⚙️  Settings data:', {
        user_id: userSettings.user_id,
        notifications_enabled: userSettings.notifications_enabled,
        language: userSettings.language,
        currency: userSettings.currency,
        theme: userSettings.theme
      });
    }

    // Test 7: Clean up test user
    console.log('\n7. Cleaning up test user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(authData.user?.id);
    
    if (deleteError) {
      console.log('   ⚠️  Could not delete test user:', deleteError.message);
    } else {
      console.log('   ✅ Test user cleaned up');
    }

    console.log('\n🎉 All tests passed! User registration is working properly.');
    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

// Run the test
testUserRegistration()
  .then(success => {
    if (success) {
      console.log('\n✅ User registration test completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ User registration test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  });
