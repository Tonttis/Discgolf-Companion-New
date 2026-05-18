import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

// Fix SQL for the broken signup trigger
// This adds EXCEPTION handling so the trigger NEVER blocks user creation,
// and drops any broken bag triggers that might be causing the failure
export const FIX_SIGNUP_SQL = `-- ============================================
-- FIX: "Database error saving new user"
-- ============================================
-- The handle_new_user trigger is breaking new user creation.
-- This SQL makes it robust with error handling so it NEVER fails signup.
-- ============================================

-- 1. Drop any broken bag triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created_bag ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_bag();

-- 2. Recreate handle_new_user with EXCEPTION handling
-- This ensures the trigger NEVER blocks user creation even if profile insert fails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  clean_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  base_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
  clean_username := REGEXP_REPLACE(base_username, '[^a-z0-9_]', '', 'g');
  IF LENGTH(clean_username) < 3 THEN
    clean_username := 'user';
  END IF;
  clean_username := SUBSTRING(clean_username FROM 1 FOR 20);
  final_username := clean_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := SUBSTRING(clean_username FROM 1 FOR (20 - LENGTH(counter::TEXT))) || counter::TEXT;
    IF counter > 999 THEN
      final_username := SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 20);
      EXIT;
    END IF;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- NEVER fail the user creation — the app will create profile as fallback
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate the trigger (only one, no duplicates)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Also add pic and link columns to bag_discs if not yet added
ALTER TABLE bag_discs ADD COLUMN IF NOT EXISTS pic text;
ALTER TABLE bag_discs ADD COLUMN IF NOT EXISTS link text;
`;

// GET /api/setup/fix-signup — Check if signup is broken and provide fix SQL
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ broken: false, message: 'Supabase not configured' });
    }

    const adminClient = await createSupabaseAdminClient();

    // Try to create a test user to see if signup is broken
    if (adminClient) {
      const testEmail = `__signup_test_${Date.now()}@internal.test`;
      const { data, error } = await adminClient.auth.admin.createUser({
        email: testEmail,
        password: 'test-password-123',
        email_confirm: true,
      });

      if (error) {
        const isBroken = error.message?.includes('Database error') || error.status === 500;

        if (isBroken) {
          return NextResponse.json({
            broken: true,
            message: 'Käyttäjän luonti on rikki — tietokantatriggeri kaataa rekisteröitymisen',
            error: error.message,
            fixSql: FIX_SIGNUP_SQL,
          });
        }
      } else if (data.user) {
        // Signup works! Clean up the test user
        await adminClient.auth.admin.deleteUser(data.user.id);
        return NextResponse.json({
          broken: false,
          message: 'Rekisteröityminen toimii normaalisti',
        });
      }
    }

    return NextResponse.json({ broken: false, message: 'Admin client not available' });
  } catch (error) {
    return NextResponse.json({
      broken: true,
      message: 'Virhe tarkistettaessa rekisteröitymistä',
      error: String(error),
      fixSql: FIX_SIGNUP_SQL,
    });
  }
}

// POST /api/setup/fix-signup — Apply the fix using admin client
// This tries to fix the trigger by re-registering the user via admin API
export async function POST(request: NextRequest) {
  try {
    const adminClient = await createSupabaseAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: 'Admin client not available' }, { status: 503 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Try to create the profile for the user using admin client (bypasses RLS)
    const { data: userData } = await adminClient.auth.admin.getUserById(userId);
    if (!userData?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userData.user;
    const baseUsername = (user.user_metadata?.username as string) || user.email?.split('@')[0] || 'user';
    const displayName = (user.user_metadata?.display_name as string) || baseUsername;

    // Check if profile already exists
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json({ success: true, message: 'Profile already exists' });
    }

    // Create the profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: userId,
        username: baseUsername,
        display_name: displayName,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Profile created' });
  } catch (error) {
    console.error('Fix signup POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
