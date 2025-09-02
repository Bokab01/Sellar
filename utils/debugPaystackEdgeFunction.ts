import { supabase } from '@/lib/supabase';

export async function debugPaystackEdgeFunction() {
  const debugLog: string[] = [];
  
  try {
    debugLog.push('🔍 Starting Paystack Edge Function Debug...');

    // Step 1: Check authentication
    debugLog.push('📋 Step 1: Checking authentication...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      debugLog.push(`❌ Session Error: ${sessionError.message}`);
      return { success: false, logs: debugLog, error: 'Session error' };
    }
    
    if (!session?.access_token) {
      debugLog.push('❌ No access token found');
      return { success: false, logs: debugLog, error: 'No access token' };
    }
    
    debugLog.push(`✅ User authenticated: ${session.user.email}`);
    debugLog.push(`✅ Access token length: ${session.access_token.length}`);

    // Step 2: Prepare test payload
    debugLog.push('📋 Step 2: Preparing test payload...');
    const testPayload = {
      amount: 1000, // 10 GHS in pesewas
      email: session.user.email!,
      reference: `debug_${Date.now()}`,
      purpose: 'credit_purchase' as const,
      purpose_id: 'starter',
    };
    
    debugLog.push(`✅ Payload prepared: ${JSON.stringify(testPayload, null, 2)}`);

    // Step 3: Check database connectivity
    debugLog.push('📋 Step 3: Testing database connectivity...');
    try {
      const { data: testQuery, error: dbError } = await supabase
        .from('paystack_transactions')
        .select('count')
        .limit(1);
      
      if (dbError) {
        debugLog.push(`❌ Database Error: ${dbError.message}`);
        return { success: false, logs: debugLog, error: 'Database connectivity issue' };
      }
      
      debugLog.push('✅ Database connectivity OK');
    } catch (dbErr: any) {
      debugLog.push(`❌ Database Exception: ${dbErr.message}`);
      return { success: false, logs: debugLog, error: 'Database exception' };
    }

    // Step 4: Test Edge Function call with detailed error handling
    debugLog.push('📋 Step 4: Calling Edge Function...');
    
    try {
      const { data, error } = await supabase.functions.invoke('paystack-initialize', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: testPayload,
      });

      if (error) {
        debugLog.push(`❌ Edge Function Error: ${JSON.stringify(error, null, 2)}`);
        
        // Check if it's a specific type of error
        if (error.message?.includes('not found')) {
          debugLog.push('💡 Suggestion: Edge Function may not be deployed');
        } else if (error.message?.includes('401') || error.message?.includes('Authorization')) {
          debugLog.push('💡 Suggestion: Authentication issue');
        } else if (error.message?.includes('400')) {
          debugLog.push('💡 Suggestion: Bad request - check payload format');
        } else if (error.message?.includes('500')) {
          debugLog.push('💡 Suggestion: Server error - check Edge Function logs');
        }
        
        return { success: false, logs: debugLog, error: error.message };
      }

      if (data) {
        debugLog.push(`✅ Edge Function Response: ${JSON.stringify(data, null, 2)}`);
        
        if (data.authorization_url) {
          debugLog.push('🎉 SUCCESS: Payment initialization worked!');
          return { success: true, logs: debugLog, data };
        } else {
          debugLog.push('⚠️ Warning: No authorization_url in response');
          return { success: false, logs: debugLog, error: 'No authorization URL' };
        }
      }

      debugLog.push('❌ No data returned from Edge Function');
      return { success: false, logs: debugLog, error: 'No data returned' };

    } catch (funcErr: any) {
      debugLog.push(`❌ Edge Function Exception: ${funcErr.message}`);
      debugLog.push(`❌ Exception Stack: ${funcErr.stack}`);
      return { success: false, logs: debugLog, error: funcErr.message };
    }

  } catch (generalErr: any) {
    debugLog.push(`❌ General Exception: ${generalErr.message}`);
    return { success: false, logs: debugLog, error: generalErr.message };
  }
}

// Helper function to format debug logs for display
export function formatDebugLogs(logs: string[]): string {
  return logs.join('\n');
}

// Helper function to run debug and show results
export async function runPaystackDebug() {
  const result = await debugPaystackEdgeFunction();
  
  console.log('🔍 PAYSTACK DEBUG RESULTS:');
  console.log('========================');
  result.logs.forEach(log => console.log(log));
  
  if (result.success) {
    console.log('\n🎉 DEBUG CONCLUSION: Paystack integration is working!');
  } else {
    console.log(`\n🚨 DEBUG CONCLUSION: Issue found - ${result.error}`);
  }
  
  return result;
}
