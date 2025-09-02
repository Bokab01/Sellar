import { supabase } from '@/lib/supabase';

export interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export async function runPaystackDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  // Test 1: Check environment variables
  console.log('🔍 Checking Paystack configuration...');
  
  const paystackPublicKey = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY;
  if (paystackPublicKey) {
    results.push({
      test: 'Paystack Public Key',
      status: 'pass',
      message: 'Public key is configured',
      details: { key: paystackPublicKey.substring(0, 10) + '...' }
    });
  } else {
    results.push({
      test: 'Paystack Public Key',
      status: 'fail',
      message: 'EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY not found in environment'
    });
  }

  // Test 2: Check Supabase connection
  console.log('🔍 Testing Supabase connection...');
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      results.push({
        test: 'Supabase Authentication',
        status: 'warning',
        message: 'No authenticated user',
        details: authError
      });
    } else if (user) {
      results.push({
        test: 'Supabase Authentication',
        status: 'pass',
        message: `Authenticated as ${user.email}`,
        details: { userId: user.id }
      });
    } else {
      results.push({
        test: 'Supabase Authentication',
        status: 'warning',
        message: 'No user session found'
      });
    }
  } catch (error) {
    results.push({
      test: 'Supabase Authentication',
      status: 'fail',
      message: 'Supabase connection failed',
      details: error
    });
  }

  // Test 3: Check database tables
  console.log('🔍 Checking database tables...');
  
  try {
    const { data: tables, error: tableError } = await supabase
      .from('paystack_transactions')
      .select('count')
      .limit(1);

    if (tableError) {
      results.push({
        test: 'Database Tables',
        status: 'fail',
        message: 'paystack_transactions table not accessible',
        details: tableError
      });
    } else {
      results.push({
        test: 'Database Tables',
        status: 'pass',
        message: 'paystack_transactions table accessible'
      });
    }
  } catch (error) {
    results.push({
      test: 'Database Tables',
      status: 'fail',
      message: 'Database table check failed',
      details: error
    });
  }

  // Test 4: Test Edge Function availability
  console.log('🔍 Testing Edge Function availability...');
  
  try {
    // Test with a minimal payload to check if function exists
    const { data, error } = await supabase.functions.invoke('paystack-initialize', {
      body: {
        amount: 100,
        email: 'test@example.com',
        reference: `diag_${Date.now()}`,
        purpose: 'credit_purchase',
        purpose_id: 'test',
      },
    });

    if (error) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        results.push({
          test: 'Edge Function Availability',
          status: 'fail',
          message: 'paystack-initialize function not deployed',
          details: error
        });
      } else if (error.message.includes('Authorization required') || error.message.includes('401')) {
        results.push({
          test: 'Edge Function Availability',
          status: 'pass',
          message: 'Function exists but requires authentication',
          details: error
        });
      } else {
        results.push({
          test: 'Edge Function Availability',
          status: 'warning',
          message: 'Function exists but returned error',
          details: error
        });
      }
    } else {
      results.push({
        test: 'Edge Function Availability',
        status: 'pass',
        message: 'Function is available and responding',
        details: data
      });
    }
  } catch (error) {
    results.push({
      test: 'Edge Function Availability',
      status: 'fail',
      message: 'Edge Function test failed',
      details: error
    });
  }

  return results;
}

export function printDiagnosticResults(results: DiagnosticResult[]) {
  console.log('\n📊 Paystack Diagnostic Results:');
  console.log('================================');
  
  results.forEach((result, index) => {
    const statusIcon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${index + 1}. ${statusIcon} ${result.test}: ${result.message}`);
    
    if (result.details && result.status !== 'pass') {
      console.log(`   Details:`, result.details);
    }
  });

  const passCount = results.filter(r => r.status === 'pass').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const failCount = results.filter(r => r.status === 'fail').length;

  console.log('\n📈 Summary:');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`⚠️  Warnings: ${warningCount}`);
  console.log(`❌ Failed: ${failCount}`);

  if (failCount === 0 && warningCount === 0) {
    console.log('\n🎉 All tests passed! Paystack integration should be working.');
  } else if (failCount > 0) {
    console.log('\n🚨 Critical issues found. Please fix the failed tests before using Paystack.');
  } else {
    console.log('\n⚠️  Some warnings found. Paystack may work but with limitations.');
  }
}

// Helper function to run diagnostics and print results
export async function diagnosePaystackIntegration() {
  try {
    const results = await runPaystackDiagnostics();
    printDiagnosticResults(results);
    return results;
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    return [];
  }
}
