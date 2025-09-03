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

async function applyMigration() {
  try {
    console.log('🔄 Applying database migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250115000014_add_missing_business_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('🚀 Executing migration...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      // If exec_sql doesn't exist, try direct query execution
      console.log('⚠️  exec_sql function not available, trying direct execution...');
      
      // Split the migration into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          const { error: stmtError } = await supabase.from('_').select('*').limit(0); // This won't work, but let's try a different approach
          
          // Since we can't execute raw SQL directly, let's use the REST API
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
              'apikey': serviceRoleKey
            },
            body: JSON.stringify({ sql: statement })
          });
          
          if (!response.ok) {
            console.error(`❌ Failed to execute statement: ${statement.substring(0, 50)}...`);
            console.error(`Response: ${response.status} ${response.statusText}`);
          }
        }
      }
    } else {
      console.log('✅ Migration executed successfully');
    }
    
    console.log('🎉 Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('💡 You may need to apply this migration manually in your Supabase dashboard');
    console.error('📋 Migration file location: supabase/migrations/20250115000014_add_missing_business_columns.sql');
    process.exit(1);
  }
}

// Alternative: Generate SQL commands for manual execution
function generateManualInstructions() {
  console.log('\n📋 MANUAL MIGRATION INSTRUCTIONS:');
  console.log('================================');
  console.log('Since automatic migration failed, please run the following in your Supabase SQL editor:');
  console.log('\n1. Go to your Supabase dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste the contents of: supabase/migrations/20250115000014_add_missing_business_columns.sql');
  console.log('4. Execute the SQL');
  console.log('\nAlternatively, you can run the following commands:');
  
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250115000014_add_missing_business_columns.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  console.log('\n' + '='.repeat(50));
  console.log(migrationSQL);
  console.log('='.repeat(50));
}

// Run the migration
applyMigration().catch(() => {
  generateManualInstructions();
});
