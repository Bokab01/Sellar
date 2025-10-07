// Supabase Edge Function: Auto-Recover Expired Reservations
// This function is called by cron-job.org every hour to recover expired reservations

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the request using either Authorization header or custom x-cron-secret
    const authHeader = req.headers.get('authorization')
    const cronSecret = req.headers.get('x-cron-secret')
    const expectedSecret = Deno.env.get('CRON_SECRET')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    // Check if request has valid authorization (either method)
    const hasValidAuth = (authHeader && authHeader.includes(anonKey!)) || 
                         (cronSecret && cronSecret === expectedSecret)
    
    if (!hasValidAuth) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized - Invalid or missing authentication' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔄 Starting auto-recovery process...')

    // Call the auto-recovery function
    const { data: recoveryResult, error: recoveryError } = await supabase
      .rpc('auto_recover_expired_reservations')

    if (recoveryError) {
      console.error('❌ Recovery error:', recoveryError)
      throw recoveryError
    }

    const recoveredCount = recoveryResult || 0
    console.log(`✅ Recovered ${recoveredCount} expired reservations`)

    // Also call the notification function for expiring reservations
    const { error: notifyError } = await supabase
      .rpc('notify_expired_reservations')

    if (notifyError) {
      console.error('⚠️ Notification error:', notifyError)
      // Don't throw - notifications are not critical
    } else {
      console.log('✅ Sent expiry notifications')
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        recovered_count: recoveredCount,
        timestamp: new Date().toISOString(),
        message: `Successfully recovered ${recoveredCount} expired reservations`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error in auto-recovery function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/* 
 * To deploy this function:
 * 1. Run: supabase functions deploy auto-recover-reservations
 * 2. Set the CRON_SECRET environment variable:
 *    supabase secrets set CRON_SECRET=your-secret-key-here
 * 3. The function URL will be:
 *    https://your-project.supabase.co/functions/v1/auto-recover-reservations
 */
