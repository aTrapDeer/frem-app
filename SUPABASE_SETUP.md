# Supabase Setup Guide

This guide will help you fix the authentication issues (406 and 409 errors) you're experiencing.

## Problem Summary

The errors you're seeing are caused by:
1. **406 (Not Acceptable)** - Row Level Security (RLS) policies are enabled but not properly configured
2. **409 (Conflict)** - Race conditions in user profile creation
3. **Multiple concurrent requests** - The app is making duplicate API calls

## Solution

We've created an automated solution that:
1. Sets up proper RLS policies for all tables
2. Creates a database trigger to automatically handle user profile creation
3. Removes race conditions by eliminating manual profile creation

## Step-by-Step Instructions

### 1. Open Supabase Dashboard
- Go to your Supabase project dashboard
- Navigate to the **SQL Editor** tab

### 2. Apply the Database Setup Script
- Copy the entire contents of `database-setup.sql` from this project
- Paste it into the SQL Editor
- Click **Run** to execute the script

### 3. Verify the Setup
After running the script, verify that:
- RLS policies are created for all user tables
- The trigger function `handle_new_user()` exists
- The trigger `on_auth_user_created` is active

You can check this by running:
```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, roles 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check trigger exists
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

### 4. Test the Authentication Flow
1. Clear your browser cache and cookies
2. Try logging in again with Google OAuth
3. Check the browser console - you should no longer see 406 or 409 errors

## What Changed in the Code

### AuthContext Improvements
- Removed manual user profile creation logic
- Added retry logic for new user data fetching
- Simplified error handling
- Eliminated race conditions

### Database Trigger Approach
- User profiles are now created automatically when someone signs up
- No more duplicate user creation attempts
- Handles Google OAuth metadata extraction automatically

### Better Error Handling
- More specific error logging
- Graceful degradation when user data is temporarily unavailable
- Proper retry mechanisms for new users

## Expected Behavior After Fix

1. **Sign In**: OAuth flow completes without errors
2. **Profile Creation**: Happens automatically via database trigger
3. **Data Loading**: Profile and settings load cleanly with retries if needed
4. **No More Errors**: 406 and 409 errors should be eliminated

## Troubleshooting

If you still see issues after applying this fix:

1. **Check RLS Policies**: Ensure all policies were created successfully
2. **Verify Trigger**: Make sure the user creation trigger is active
3. **Clear Cache**: Clear browser cache and try in an incognito window
4. **Check Logs**: Look at the Supabase logs in the dashboard for any errors

## Additional Notes

- This approach is more robust and follows Supabase best practices
- User creation is now handled at the database level, ensuring consistency
- The retry logic handles the slight delay between user signup and profile creation
- RLS policies ensure data security while allowing proper access

If you continue to experience issues, please check the browser console logs and Supabase dashboard logs for any additional error details. 