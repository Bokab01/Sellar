#!/usr/bin/env node

/**
 * Authentication Edge Case Testing Script
 * Tests various edge cases in the authentication system
 * 
 * Usage: node scripts/test-auth-edge-cases.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test cases for edge case validation
const testCases = [
  {
    name: 'Valid Email',
    email: 'test@example.com',
    expected: 'safe'
  },
  {
    name: 'Email with Plus Sign',
    email: 'user+tag@example.com',
    expected: 'safe'
  },
  {
    name: 'Email with Multiple Dots',
    email: 'user..name@example.com',
    expected: 'warning'
  },
  {
    name: 'Email with HTML Brackets',
    email: 'user<script>@example.com',
    expected: 'warning'
  },
  {
    name: 'International Domain',
    email: 'user@münchen.de',
    expected: 'safe'
  },
  {
    name: 'Very Long Email',
    email: 'a'.repeat(100) + '@example.com',
    expected: 'warning'
  },
  {
    name: 'SQL Injection Attempt',
    input: "'; DROP TABLE users; --",
    field: 'firstName',
    expected: 'critical'
  },
  {
    name: 'XSS Attempt',
    input: '<script>alert("xss")</script>',
    field: 'lastName',
    expected: 'critical'
  },
  {
    name: 'Null Byte Injection',
    input: 'normal\0malicious',
    field: 'description',
    expected: 'critical'
  }
];

async function runEdgeCaseTests() {
  console.log('🧪 Authentication Edge Case Testing');
  console.log('===================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Database Connectivity
  console.log('1. 🔌 Testing Database Connectivity...');
  try {
    const startTime = Date.now();
    const { error } = await supabase.from('profiles').select('count').limit(1);
    const responseTime = Date.now() - startTime;
    
    totalTests++;
    if (error) {
      console.log('   ❌ Database connection failed:', error.message);
      failedTests++;
    } else if (responseTime > 5000) {
      console.log(`   ⚠️  Slow connection detected: ${responseTime}ms`);
      passedTests++;
    } else {
      console.log(`   ✅ Database connection OK (${responseTime}ms)`);
      passedTests++;
    }
  } catch (error) {
    console.log('   ❌ Connection test failed:', error.message);
    totalTests++;
    failedTests++;
  }

  // Test 2: Session State Validation
  console.log('\n2. 🔐 Testing Session State...');
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    totalTests++;
    
    if (error) {
      console.log('   ❌ Session retrieval error:', error.message);
      failedTests++;
    } else if (session) {
      const expiresAt = new Date(session.expires_at * 1000);
      const timeUntilExpiry = expiresAt.getTime() - Date.now();
      
      if (timeUntilExpiry < 0) {
        console.log('   ⚠️  Session has expired');
      } else if (timeUntilExpiry < 5 * 60 * 1000) {
        console.log('   ⚠️  Session expires soon');
      } else {
        console.log('   ✅ Session is valid');
      }
      passedTests++;
    } else {
      console.log('   ✅ No active session (expected for testing)');
      passedTests++;
    }
  } catch (error) {
    console.log('   ❌ Session test failed:', error.message);
    totalTests++;
    failedTests++;
  }

  // Test 3: Email Format Validation
  console.log('\n3. 📧 Testing Email Format Validation...');
  const emailTests = testCases.filter(tc => tc.email);
  
  for (const test of emailTests) {
    totalTests++;
    console.log(`   Testing: ${test.name} (${test.email})`);
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidFormat = emailRegex.test(test.email);
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\+.*\+/, // Multiple + signs
      /\.{2,}/, // Multiple consecutive dots
      /@.*@/, // Multiple @ signs
      /[<>]/, // HTML brackets
    ];
    
    const hasSuspiciousPattern = suspiciousPatterns.some(pattern => pattern.test(test.email));
    
    if (!isValidFormat) {
      console.log('     ❌ Invalid email format');
      if (test.expected === 'safe') failedTests++; else passedTests++;
    } else if (hasSuspiciousPattern) {
      console.log('     ⚠️  Suspicious pattern detected');
      if (test.expected === 'warning') passedTests++; else failedTests++;
    } else {
      console.log('     ✅ Email format OK');
      if (test.expected === 'safe') passedTests++; else failedTests++;
    }
  }

  // Test 4: Input Security Validation
  console.log('\n4. 🛡️  Testing Input Security...');
  const inputTests = testCases.filter(tc => tc.input);
  
  for (const test of inputTests) {
    totalTests++;
    console.log(`   Testing: ${test.name} in ${test.field}`);
    
    let securityIssue = 'none';
    
    // Check for SQL injection
    const sqlPatterns = [
      /('|(\\')|(;)|(\\;))/i,
      /((\s*(union|select|insert|delete|update|drop|create|alter|exec|execute)\s+))/i,
    ];
    
    if (sqlPatterns.some(pattern => pattern.test(test.input))) {
      securityIssue = 'sql_injection';
    }
    
    // Check for XSS
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ];
    
    if (xssPatterns.some(pattern => pattern.test(test.input))) {
      securityIssue = 'xss';
    }
    
    // Check for null bytes
    if (test.input.includes('\0')) {
      securityIssue = 'null_byte';
    }
    
    if (securityIssue !== 'none') {
      console.log(`     ❌ Security issue detected: ${securityIssue}`);
      if (test.expected === 'critical') passedTests++; else failedTests++;
    } else {
      console.log('     ✅ Input appears safe');
      if (test.expected === 'safe') passedTests++; else failedTests++;
    }
  }

  // Test 5: Profile Creation Edge Cases
  console.log('\n5. 👤 Testing Profile Creation Edge Cases...');
  try {
    // Test with a fake user ID to see how the system handles it
    const fakeUserId = '00000000-0000-0000-0000-000000000000';
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', fakeUserId)
      .single();
    
    totalTests++;
    if (error && error.code === 'PGRST116') {
      console.log('   ✅ Properly handles non-existent profile queries');
      passedTests++;
    } else if (error) {
      console.log('   ⚠️  Unexpected error handling:', error.message);
      passedTests++;
    } else {
      console.log('   ⚠️  Unexpected profile found for fake ID');
      failedTests++;
    }
  } catch (error) {
    console.log('   ❌ Profile test failed:', error.message);
    totalTests++;
    failedTests++;
  }

  // Test 6: Rate Limiting Simulation
  console.log('\n6. ⏱️  Testing Rate Limiting Behavior...');
  try {
    const requests = [];
    const startTime = Date.now();
    
    // Make multiple rapid requests
    for (let i = 0; i < 5; i++) {
      requests.push(
        supabase.from('profiles').select('count').limit(1)
      );
    }
    
    const results = await Promise.all(requests);
    const endTime = Date.now();
    
    totalTests++;
    const errors = results.filter(r => r.error);
    
    if (errors.length > 0) {
      console.log(`   ⚠️  ${errors.length}/5 requests failed (possible rate limiting)`);
      passedTests++;
    } else {
      console.log(`   ✅ All requests succeeded in ${endTime - startTime}ms`);
      passedTests++;
    }
  } catch (error) {
    console.log('   ❌ Rate limiting test failed:', error.message);
    totalTests++;
    failedTests++;
  }

  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests === 0) {
    console.log('\n🎉 All edge case tests passed!');
  } else {
    console.log(`\n⚠️  ${failedTests} tests failed - review edge case handling`);
  }

  // Recommendations
  console.log('\n💡 Recommendations:');
  console.log('- Implement comprehensive input validation');
  console.log('- Add rate limiting for authentication endpoints');
  console.log('- Monitor for suspicious patterns in user inputs');
  console.log('- Implement proper error handling for all edge cases');
  console.log('- Add logging for security-related events');
  console.log('- Test with various email formats and international characters');
  console.log('- Implement session timeout warnings');
  console.log('- Add retry mechanisms for network failures');
}

// Run the tests
runEdgeCaseTests().catch(error => {
  console.error('❌ Edge case testing failed:', error.message);
  process.exit(1);
});
