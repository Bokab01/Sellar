#!/usr/bin/env node

/**
 * Clean Unconfirmed Users Script
 * This script helps clean up unconfirmed user accounts that might be blocking registration
 * 
 * Usage: node scripts/clean-unconfirmed-users.js your-email@example.com
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please check your .env file for:');
  console.error('- EXPO_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanUnconfirmedUser(email) {
  console.log('🧹 Cleaning unconfirmed user for:', email);
  console.log('=====================================\n');

  try {
    // Step 1: List all users to find the unconfirmed one
    console.log('1. 🔍 Searching for existing users...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.log('   ❌ Error listing users:', listError.message);
      return;
    }

    const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!existingUser) {
      console.log('   ✅ No existing user found - email is available');
      return;
    }

    console.log('   📊 Found existing user:', {
      id: existingUser.id,
      email: existingUser.email,
      confirmed: !!existingUser.email_confirmed_at,
      created: existingUser.created_at
    });

    // Step 2: Check if user is confirmed
    if (existingUser.email_confirmed_at) {
      console.log('   ⚠️  User email is already confirmed');
      console.log('   💡 This is a legitimate account - cannot clean up');
      console.log('   🔑 Try signing in instead of registering');
      return;
    }

    // Step 3: Clean up unconfirmed user
    console.log('\n2. 🗑️  Cleaning up unconfirmed user...');
    
    // Delete from auth.users
    const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
    
    if (deleteError) {
      console.log('   ❌ Error deleting user:', deleteError.message);
      return;
    }

    console.log('   ✅ Successfully deleted unconfirmed user');

    // Step 4: Clean up any profile data
    console.log('\n3. 🧹 Cleaning up profile data...');
    
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', existingUser.id);
    
    if (profileError) {
      console.log('   ⚠️  Profile cleanup warning:', profileError.message);
    } else {
      console.log('   ✅ Profile data cleaned up');
    }

    // Step 5: Verify cleanup
    console.log('\n4. ✅ Verification...');
    
    const { data: { users: afterUsers }, error: verifyError } = await supabase.auth.admin.listUsers();
    
    if (!verifyError) {
      const stillExists = afterUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!stillExists) {
        console.log('   ✅ User successfully removed');
        console.log('   🎉 Email is now available for registration');
      } else {
        console.log('   ⚠️  User still exists - cleanup may have failed');
      }
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }

  console.log('\n🏁 Cleanup complete!');
  console.log('💡 You can now try registering with this email again.');
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.error('Usage: node scripts/clean-unconfirmed-users.js your-email@example.com');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

// Run cleanup
cleanUnconfirmedUser(email).catch(error => {
  console.error('❌ Cleanup failed:', error.message);
  process.exit(1);
});
