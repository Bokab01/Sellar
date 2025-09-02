import { supabase } from '@/lib/supabase';

export async function checkPaystackTableStructure() {
  try {
    console.log('🔍 Checking paystack_transactions table structure...');

    // Try to get table info by attempting a select with limit 0
    const { data, error } = await supabase
      .from('paystack_transactions')
      .select('*')
      .limit(0);

    if (error) {
      console.error('❌ Table access error:', error);
      return { 
        success: false, 
        error: error.message,
        suggestion: 'Table might not exist or RLS is blocking access'
      };
    }

    console.log('✅ Table exists and is accessible');

    // Try to check if we can insert a minimal record
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Test insert with minimal required fields
    const testRecord = {
      user_id: user.id,
      reference: `structure_test_${Date.now()}`,
      amount: 1.00,
      currency: 'GHS',
      payment_method: 'card',
      purchase_type: 'credit_purchase',
      purchase_id: 'test',
      customer_email: user.email,
      status: 'pending'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('paystack_transactions')
      .insert(testRecord)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert test failed:', insertError);
      return {
        success: false,
        error: insertError.message,
        code: insertError.code,
        suggestion: insertError.code === '23503' 
          ? 'Foreign key constraint - user might not exist in profiles table'
          : insertError.code === '42501'
          ? 'Permission denied - RLS policy issue'
          : 'Database constraint or structure issue'
      };
    }

    console.log('✅ Insert test successful');

    // Clean up
    await supabase
      .from('paystack_transactions')
      .delete()
      .eq('id', insertData.id);

    console.log('✅ Test record cleaned up');

    return {
      success: true,
      message: 'Table structure and permissions are correct'
    };

  } catch (error: any) {
    console.error('❌ Structure check failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
