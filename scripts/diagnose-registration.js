#!/usr/bin/env node

/**
 * Registration Diagnostics Script
 * Run this to diagnose "email already exists" issues
 * 
 * Usage: node scripts/diagnose-registration.js your-email@example.com
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please check your .env file for:');
  console.error('- EXPO_PUBLIC_SUPABASE_URL');
  console.error('- EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostics(email) {
  console.log('🔍 Registration Diagnostics for:', email);
  console.log('=====================================\n');

  // Step 1: Test database connection
  console.log('1. 🔌 Testing database connection...');
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.log('   ❌ Database connection failed:', error.message);
      console.log('   💡 Try running: npx supabase start');
      return;
    } else {
      console.log('   ✅ Database connection successful');
    }
  } catch (error) {
    console.log('   ❌ Database connection error:', error.message);
    return;
  }

  // Step 2: Check profiles table
  console.log('\n2. 👤 Checking profiles table...');
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, created_at, first_name, last_name')
      .eq('email', email.trim().toLowerCase());
    
    if (error) {
      console.log('   ❌ Error checking profiles:', error.message);
    } else if (profiles && profiles.length > 0) {
      console.log('   ⚠️  Email found in profiles table!');
      console.log('   📊 Records found:', profiles.length);
      profiles.forEach((profile, index) => {
        console.log(`   Record ${index + 1}:`, {
          id: profile.id,
          email: profile.email,
          name: `${profile.first_name} ${profile.last_name}`,
          created: profile.created_at
        });
      });
      console.log('   💡 This is why you\'re getting "email already exists"');
    } else {
      console.log('   ✅ Email not found in profiles table');
    }
  } catch (error) {
    console.log('   ❌ Profiles check failed:', error.message);
  }

  // Step 3: Test auth signup (simulation)
  console.log('\n3. 🔐 Testing auth system...');
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('   ✅ Auth client working correctly');
    console.log('   📊 Current session:', data.session ? 'Active' : 'None');
  } catch (error) {
    console.log('   ❌ Auth client error:', error.message);
  }

  // Step 4: Check for case sensitivity issues
  console.log('\n4. 🔤 Checking case sensitivity...');
  try {
    const variations = [
      email.toLowerCase(),
      email.toUpperCase(),
      email.charAt(0).toUpperCase() + email.slice(1).toLowerCase()
    ];

    for (const variation of variations) {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', variation)
        .limit(1);
      
      if (!error && profiles && profiles.length > 0) {
        console.log(`   ⚠️  Found match for: ${variation}`);
      }
    }
    console.log('   ✅ Case sensitivity check complete');
  } catch (error) {
    console.log('   ❌ Case sensitivity check failed:', error.message);
  }

  // Step 5: Provide recommendations
  console.log('\n5. 💡 Recommendations:');
  
  const { data: existingProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.trim().toLowerCase());
  
  if (existingProfiles && existingProfiles.length > 0) {
    console.log('   🎯 ROOT CAUSE: Email exists in profiles table');
    console.log('   🔧 SOLUTIONS:');
    console.log('      a) Use a different email address');
    console.log('      b) Sign in instead of registering');
    console.log('      c) If this is test data, clean up the database:');
    console.log(`         DELETE FROM profiles WHERE email = '${email}';`);
    console.log('   ⚠️  WARNING: Only delete test data, not real user accounts!');
  } else {
    console.log('   ✅ Email appears to be available');
    console.log('   🔧 If you\'re still getting errors, try:');
    console.log('      a) Restart your Supabase instance: npx supabase restart');
    console.log('      b) Check for network connectivity issues');
    console.log('      c) Verify your .env configuration');
  }

  console.log('\n🏁 Diagnostics complete!');
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.error('Usage: node scripts/diagnose-registration.js your-email@example.com');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

// Run diagnostics
runDiagnostics(email).catch(error => {
  console.error('❌ Diagnostics failed:', error.message);
  process.exit(1);
});
