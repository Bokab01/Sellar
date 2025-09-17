// Test script to check business plan detection
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testBusinessPlanDetection() {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('No authenticated user');
      return;
    }

    console.log('Testing business plan detection for user:', user.id);

    // Test 1: Check user_subscriptions table
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('current_period_end', new Date().toISOString());

    console.log('Active subscriptions:', subscriptions);
    console.log('Subscription error:', subError);

    // Test 2: Check get_user_entitlements function
    const { data: entitlements, error: entError } = await supabase.rpc('get_user_entitlements', {
      p_user_id: user.id,
    });

    console.log('User entitlements:', entitlements);
    console.log('Entitlements error:', entError);

    // Test 3: Check subscription_plans table
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*')
      .ilike('name', '%business%');

    console.log('Business plans:', plans);
    console.log('Plans error:', plansError);

  } catch (error) {
    console.error('Test error:', error);
  }
}

testBusinessPlanDetection();
