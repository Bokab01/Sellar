# 📧 Email Verification Fix Guide

## 🚨 **Problem**
Email verification confirmation links from Supabase are not working properly after user registration.

## ✅ **Solution Steps**

### **Step 1: Configure Supabase Dashboard**

1. **Go to your Supabase Dashboard**
   - Navigate to Authentication > URL Configuration
   - Add these redirect URLs:

   **For Development:**
   ```
   exp://localhost:8081/--/(auth)/email-confirmation
   exp://127.0.0.1:8081/--/(auth)/email-confirmation
   http://localhost:8081/(auth)/email-confirmation
   ```

   **For Production:**
   ```
   https://your-app-domain.com/(auth)/email-confirmation
   ```

2. **Check Email Templates**
   - Go to Authentication > Email Templates > Confirm signup
   - Make sure the confirmation URL is set to: `{{ .ConfirmationURL }}`

### **Step 2: Update App Configuration**

I've already added the missing route to your auth layout. The email confirmation screen exists at `app/(auth)/email-confirmation.tsx`.

### **Step 3: Test the Fix**

1. **Register a new user:**
   ```javascript
   const { data, error } = await supabase.auth.signUp({
     email: 'test@example.com',
     password: 'password123'
   });
   ```

2. **Check your email** and click the confirmation link

3. **The link should now redirect** to your app's email confirmation screen

### **Step 4: Alternative - Handle Email Confirmation in App**

If the redirect still doesn't work, you can handle email confirmation directly in your app:

```javascript
// In your main app component or auth handler
useEffect(() => {
  const { data: authListener } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // User successfully confirmed email
        router.replace('/(tabs)/home');
      }
    }
  );

  return () => {
    authListener.subscription.unsubscribe();
  };
}, []);
```

### **Step 5: Debug Email Verification**

If it's still not working, check:

1. **Email delivery** - Check spam folder
2. **Console logs** - Look for errors in the email confirmation screen
3. **Network tab** - Check if the verification API call is successful
4. **Supabase logs** - Check your Supabase project logs

### **Step 6: Manual Email Verification (Temporary)**

For testing, you can manually verify emails in Supabase:

1. Go to Authentication > Users
2. Find the user
3. Click on them and manually set `email_confirmed_at`

## 🧪 **Testing Checklist**

- [ ] User can register successfully
- [ ] Verification email is sent
- [ ] Email contains correct confirmation link
- [ ] Clicking link opens the app
- [ ] Email confirmation screen appears
- [ ] User is redirected to home screen
- [ ] User can access protected features

## 🔧 **Common Issues & Fixes**

### **Issue 1: "Invalid confirmation link"**
- **Cause:** URL parameters not being parsed correctly
- **Fix:** Check the email-confirmation screen parameter handling

### **Issue 2: "Email confirmation failed"**
- **Cause:** Token expired or already used
- **Fix:** Generate a new confirmation email

### **Issue 3: Link opens browser instead of app**
- **Cause:** Deep linking not configured properly
- **Fix:** Configure proper URL schemes in app.json

### **Issue 4: Redirect URL not allowed**
- **Cause:** URL not added to Supabase allowed list
- **Fix:** Add all development and production URLs to Supabase dashboard

## 📱 **App Configuration**

Make sure your `app.json` includes proper URL schemes:

```json
{
  "expo": {
    "scheme": "sellar",
    "web": {
      "bundler": "metro"
    }
  }
}
```

## 🎯 **Expected Flow**

1. User registers → Gets "Check your email" message
2. User clicks email link → App opens to email-confirmation screen
3. Screen shows "Confirming..." → Calls Supabase verification
4. Success → Redirects to home screen
5. User is now verified and logged in

---

**Status**: ✅ Route added, configuration guide provided
**Next**: Configure Supabase dashboard redirect URLs
**Priority**: 🔴 Critical for user onboarding
