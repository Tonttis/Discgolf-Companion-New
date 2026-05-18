import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

// Fix SQL for the broken signup trigger
export const FIX_SIGNUP_SQL = `-- ============================================
-- FIX: "Database error saving new user"
-- ============================================
-- The handle_new_user_bag trigger is breaking new user creation.
-- This SQL drops it (we have auto-create in the app instead)
-- and makes handle_new_user more robust with error handling.
-- ============================================

-- 1. Drop the broken bag trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created_bag ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_bag();

-- 2. Recreate handle_new_user with error handling so it never blocks signup
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
  -- Log error but NEVER fail the user creation
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Also add pic and link columns to bag_discs if not yet added
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
            dashboardUrl: 'https://supabase.com/dashboard/project/hzfizsucmelyxrnmpxib/sql',
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
      dashboardUrl: 'https://supabase.com/dashboard/project/hzfizsucmelyxrnmpxib/sql',
    });
  }
}
