const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables: EXPO_PUBLIC_SUPABASE_URL or SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runDebugScript() {
  try {
    console.log('🔍 Running table structure debug script...');
    
    // Read the debug migration file
    const debugPath = path.join(__dirname, '..', 'New_migration', '34d_debug_table_structures.sql');
    const debugSQL = fs.readFileSync(debugPath, 'utf8');
    
    console.log('📄 Debug script loaded');
    console.log('🚀 Executing debug script...');
    
    // Try to execute via RPC first
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: debugSQL
      });
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Debug script executed via RPC');
      if (data) {
        console.log('📊 Debug Results:', data);
      }
      
    } catch (rpcError) {
      console.log('⚠️  RPC method failed, trying REST API...');
      
      // Try REST API approach
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey
        },
        body: JSON.stringify({ sql: debugSQL })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ REST API failed: ${response.status} ${response.statusText}`);
        console.error('Error details:', errorText);
        throw new Error(`REST API execution failed: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Debug script executed via REST API');
      console.log('📊 Debug Results:', result);
    }
    
  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
    console.log('\n📋 MANUAL EXECUTION INSTRUCTIONS:');
    console.log('================================');
    console.log('Please run the debug script manually in your Supabase SQL editor:');
    console.log('\n1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of: New_migration/34d_debug_table_structures.sql');
    console.log('4. Execute the SQL and share the output');
    
    // Also output the SQL for easy copying
    const debugPath = path.join(__dirname, '..', 'New_migration', '34d_debug_table_structures.sql');
    const debugSQL = fs.readFileSync(debugPath, 'utf8');
    console.log('\n' + '='.repeat(80));
    console.log('DEBUG SQL TO COPY:');
    console.log('='.repeat(80));
    console.log(debugSQL);
    console.log('='.repeat(80));
  }
}

// Run the debug script
runDebugScript();
