const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '../.env' })

// ⚠️ Use your service role key, NOT the anon key
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function deleteUserByEmail(email) {
    // Step 1: Look up the user ID via SQL query
    const { data: users, error: lookupError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', email)
  
    if (lookupError) throw lookupError
    if (!users || users.length === 0) {
      console.log(`❌ No user found with email: ${email}`)
      return
    }
  
    const user = users[0]
  
    // Step 2: Delete user with Admin API
    const { error } = await supabase.auth.admin.deleteUser(user.id)
    if (error) throw error
  
    console.log(`✅ Deleted user: ${user.email} (ID: ${user.id})`)
  }
  
  // Example usage
  ;(async () => {
    const testEmail = 'testuser1@example.com' // 👈 put the email you want to delete here
    await deleteUserByEmail(testEmail)
  })()