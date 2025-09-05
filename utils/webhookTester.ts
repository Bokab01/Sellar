import { supabase } from '@/lib/supabase';

export interface WebhookTestResult {
  success: boolean;
  message: string;
  details?: any;
}

export async function testWebhookConfiguration(): Promise<WebhookTestResult> {
  try {
    console.log('🔍 Testing webhook configuration...');

    // 1. Check if webhook function is accessible
    const webhookUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/paystack-webhook`;
    console.log('📡 Webhook URL:', webhookUrl);

    // 2. Check recent transactions for webhook status
    const { data: transactions, error } = await supabase
      .from('paystack_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      return {
        success: false,
        message: 'Failed to fetch transactions',
        details: error
      };
    }

    console.log('📊 Recent transactions:', transactions);

    // 3. Check for webhook processing status
    const processedWebhooks = transactions?.filter(t => (t as any).webhook_received) || [];
    const pendingWebhooks = transactions?.filter(t => !(t as any).webhook_received && (t as any).status === 'pending') || [];

    return {
      success: true,
      message: 'Webhook configuration checked',
      details: {
        webhookUrl,
        totalTransactions: transactions?.length || 0,
        processedWebhooks: processedWebhooks.length,
        pendingWebhooks: pendingWebhooks.length,
        recentTransactions: transactions?.map(t => ({
          reference: (t as any).reference,
          status: (t as any).status,
          webhook_received: (t as any).webhook_received,
          webhook_processed: (t as any).webhook_processed,
          created_at: (t as any).created_at
        }))
      }
    };

  } catch (error: any) {
    return {
      success: false,
      message: 'Webhook test failed',
      details: error.message
    };
  }
}

export async function simulateWebhookCall(reference: string): Promise<WebhookTestResult> {
  try {
    console.log('🧪 Simulating webhook call for reference:', reference);

    // Get the transaction
    const { data: transaction, error } = await supabase
      .from('paystack_transactions')
      .select('*')
      .eq('reference', reference)
      .single();

    if (error || !transaction) {
      return {
        success: false,
        message: 'Transaction not found',
        details: error
      };
    }

    // Simulate successful webhook payload
    const webhookPayload = {
      event: 'charge.success',
      data: {
        id: (transaction as any).transaction_id || 'test_transaction_id',
        reference: reference,
        amount: (transaction as any).amount * 100, // Convert to pesewas
        status: 'success',
        paid_at: new Date().toISOString(),
        customer: {
          email: (transaction as any).customer_email
        }
      }
    };

    console.log('📤 Webhook payload:', webhookPayload);

    // Call the webhook function directly
    const webhookUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/paystack-webhook`;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': 'test_signature', // This would normally be calculated
      },
      body: JSON.stringify(webhookPayload)
    });

    const responseText = await response.text();

    return {
      success: response.ok,
      message: response.ok ? 'Webhook simulation successful' : 'Webhook simulation failed',
      details: {
        status: response.status,
        response: responseText,
        payload: webhookPayload
      }
    };

  } catch (error: any) {
    return {
      success: false,
      message: 'Webhook simulation failed',
      details: error.message
    };
  }
}

export async function checkPaystackWebhookConfig(): Promise<WebhookTestResult> {
  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl) {
      return {
        success: false,
        message: 'Supabase URL not configured'
      };
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/paystack-webhook`;

    return {
      success: true,
      message: 'Paystack webhook configuration',
      details: {
        webhookUrl,
        instructions: [
          '1. Go to Paystack Dashboard → Settings → Webhooks',
          '2. Add this URL as your webhook endpoint:',
          `   ${webhookUrl}`,
          '3. Select these events:',
          '   - charge.success',
          '   - charge.failed',
          '4. Save the webhook configuration',
          '5. Test with a small payment'
        ]
      }
    };

  } catch (error: any) {
    return {
      success: false,
      message: 'Configuration check failed',
      details: error.message
    };
  }
}
