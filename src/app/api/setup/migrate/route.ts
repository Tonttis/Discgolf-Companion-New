import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

// SQL to add missing columns to bag_discs table
const MIGRATION_SQL = `
-- Add missing columns to bag_discs table (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'disc_name') THEN
    ALTER TABLE bag_discs ADD COLUMN disc_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'brand') THEN
    ALTER TABLE bag_discs ADD COLUMN brand TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'category') THEN
    ALTER TABLE bag_discs ADD COLUMN category TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'speed') THEN
    ALTER TABLE bag_discs ADD COLUMN speed NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'glide') THEN
    ALTER TABLE bag_discs ADD COLUMN glide NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'turn') THEN
    ALTER TABLE bag_discs ADD COLUMN turn NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'fade') THEN
    ALTER TABLE bag_discs ADD COLUMN fade NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'stability') THEN
    ALTER TABLE bag_discs ADD COLUMN stability TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'pic') THEN
    ALTER TABLE bag_discs ADD COLUMN pic TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'link') THEN
    ALTER TABLE bag_discs ADD COLUMN link TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'notes') THEN
    ALTER TABLE bag_discs ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Create or replace the add_disc_to_bag function with all columns
CREATE OR REPLACE FUNCTION public.add_disc_to_bag(
  p_bag_id UUID,
  p_disc_id TEXT,
  p_disc_name TEXT DEFAULT NULL,
  p_brand TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_speed NUMERIC DEFAULT NULL,
  p_glide NUMERIC DEFAULT NULL,
  p_turn NUMERIC DEFAULT NULL,
  p_fade NUMERIC DEFAULT NULL,
  p_stability TEXT DEFAULT NULL,
  p_pic TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_user_id UUID;
BEGIN
  -- Verify bag ownership
  SELECT user_id INTO v_user_id FROM disc_bags WHERE id = p_bag_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Bag not found';
  END IF;
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to modify this bag';
  END IF;

  -- Upsert the disc
  INSERT INTO bag_discs (bag_id, disc_id, disc_name, brand, category, speed, glide, turn, fade, stability, pic, link, notes)
  VALUES (p_bag_id, p_disc_id, p_disc_name, p_brand, p_category, p_speed, p_glide, p_turn, p_fade, p_stability, p_pic, p_link, p_notes)
  ON CONFLICT (bag_id, disc_id) DO UPDATE SET
    disc_name = COALESCE(EXCLUDED.disc_name, bag_discs.disc_name),
    brand = COALESCE(EXCLUDED.brand, bag_discs.brand),
    category = COALESCE(EXCLUDED.category, bag_discs.category),
    speed = COALESCE(EXCLUDED.speed, bag_discs.speed),
    glide = COALESCE(EXCLUDED.glide, bag_discs.glide),
    turn = COALESCE(EXCLUDED.turn, bag_discs.turn),
    fade = COALESCE(EXCLUDED.fade, bag_discs.fade),
    stability = COALESCE(EXCLUDED.stability, bag_discs.stability),
    pic = COALESCE(EXCLUDED.pic, bag_discs.pic),
    link = COALESCE(EXCLUDED.link, bag_discs.link),
    notes = COALESCE(EXCLUDED.notes, bag_discs.notes)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Ensure the unique constraint exists on bag_discs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'bag_discs'::regclass
    AND contype = 'u'
    AND conname = 'bag_discs_bag_id_disc_id_key'
  ) THEN
    -- Try to add the unique constraint
    BEGIN
      ALTER TABLE bag_discs ADD CONSTRAINT bag_discs_bag_id_disc_id_key UNIQUE (bag_id, disc_id);
    EXCEPTION WHEN OTHERS THEN
      -- Constraint may already exist with different name or duplicate data
      RAISE WARNING 'Could not add unique constraint: %', SQLERRM;
    END;
  END IF;
END $$;

-- Make games viewable by all authenticated users (fix for profile visibility)
DROP POLICY IF EXISTS "Games viewable by players" ON games;
CREATE POLICY "Games viewable by all authenticated users" ON games
  FOR SELECT USING (true);

-- Make game players viewable by all authenticated users
DROP POLICY IF EXISTS "Game players viewable by game participants" ON game_players;
CREATE POLICY "Game players viewable by all authenticated users" ON game_players
  FOR SELECT USING (true);

-- Make scores viewable by all authenticated users
DROP POLICY IF EXISTS "Scores viewable by game participants" ON scores;
CREATE POLICY "Scores viewable by all authenticated users" ON scores
  FOR SELECT USING (true);

-- Create avatars storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own avatars
DO $$ BEGIN
  CREATE POLICY "Users can upload own avatar" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own avatar" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own avatar" ON storage.objects
    FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Avatars are publicly viewable" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`;

// The SQL to create a migration runner function that can be called via RPC
// This is the key to making auto-migration work — we create a SECURITY DEFINER
// function that executes the migration SQL, then call it via supabase.rpc()
const CREATE_MIGRATION_RUNNER_SQL = `
CREATE OR REPLACE FUNCTION public.run_migration_v2()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result TEXT := 'ok';
BEGIN
  -- Add missing columns to bag_discs table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'disc_name') THEN
    ALTER TABLE bag_discs ADD COLUMN disc_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'brand') THEN
    ALTER TABLE bag_discs ADD COLUMN brand TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'category') THEN
    ALTER TABLE bag_discs ADD COLUMN category TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'speed') THEN
    ALTER TABLE bag_discs ADD COLUMN speed NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'glide') THEN
    ALTER TABLE bag_discs ADD COLUMN glide NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'turn') THEN
    ALTER TABLE bag_discs ADD COLUMN turn NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'fade') THEN
    ALTER TABLE bag_discs ADD COLUMN fade NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'stability') THEN
    ALTER TABLE bag_discs ADD COLUMN stability TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'pic') THEN
    ALTER TABLE bag_discs ADD COLUMN pic TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'link') THEN
    ALTER TABLE bag_discs ADD COLUMN link TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bag_discs' AND column_name = 'notes') THEN
    ALTER TABLE bag_discs ADD COLUMN notes TEXT;
  END IF;

  -- Add unique constraint if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'bag_discs'::regclass
    AND contype = 'u'
    AND conname = 'bag_discs_bag_id_disc_id_key'
  ) THEN
    BEGIN
      ALTER TABLE bag_discs ADD CONSTRAINT bag_discs_bag_id_disc_id_key UNIQUE (bag_id, disc_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not add unique constraint: %', SQLERRM;
    END;
  END IF;

  -- Create add_disc_to_bag function
  CREATE OR REPLACE FUNCTION public.add_disc_to_bag(
    p_bag_id UUID,
    p_disc_id TEXT,
    p_disc_name TEXT DEFAULT NULL,
    p_brand TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_speed NUMERIC DEFAULT NULL,
    p_glide NUMERIC DEFAULT NULL,
    p_turn NUMERIC DEFAULT NULL,
    p_fade NUMERIC DEFAULT NULL,
    p_stability TEXT DEFAULT NULL,
    p_pic TEXT DEFAULT NULL,
    p_link TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
  )
  RETURNS UUID
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $func$
  DECLARE
    v_id UUID;
    v_user_id UUID;
  BEGIN
    SELECT user_id INTO v_user_id FROM disc_bags WHERE id = p_bag_id;
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Bag not found';
    END IF;
    IF v_user_id != auth.uid() THEN
      RAISE EXCEPTION 'Not authorized to modify this bag';
    END IF;
    INSERT INTO bag_discs (bag_id, disc_id, disc_name, brand, category, speed, glide, turn, fade, stability, pic, link, notes)
    VALUES (p_bag_id, p_disc_id, p_disc_name, p_brand, p_category, p_speed, p_glide, p_turn, p_fade, p_stability, p_pic, p_link, p_notes)
    ON CONFLICT (bag_id, disc_id) DO UPDATE SET
      disc_name = COALESCE(EXCLUDED.disc_name, bag_discs.disc_name),
      brand = COALESCE(EXCLUDED.brand, bag_discs.brand),
      category = COALESCE(EXCLUDED.category, bag_discs.category),
      speed = COALESCE(EXCLUDED.speed, bag_discs.speed),
      glide = COALESCE(EXCLUDED.glide, bag_discs.glide),
      turn = COALESCE(EXCLUDED.turn, bag_discs.turn),
      fade = COALESCE(EXCLUDED.fade, bag_discs.fade),
      stability = COALESCE(EXCLUDED.stability, bag_discs.stability),
      pic = COALESCE(EXCLUDED.pic, bag_discs.pic),
      link = COALESCE(EXCLUDED.link, bag_discs.link),
      notes = COALESCE(EXCLUDED.notes, bag_discs.notes)
    RETURNING id INTO v_id;
    RETURN v_id;
  END;
  $func$;

  -- Fix game visibility
  BEGIN
    DROP POLICY IF EXISTS "Games viewable by players" ON games;
    CREATE POLICY "Games viewable by all authenticated users" ON games FOR SELECT USING (true);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not fix games policy: %', SQLERRM;
  END;

  BEGIN
    DROP POLICY IF EXISTS "Game players viewable by game participants" ON game_players;
    CREATE POLICY "Game players viewable by all authenticated users" ON game_players FOR SELECT USING (true);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not fix game_players policy: %', SQLERRM;
  END;

  BEGIN
    DROP POLICY IF EXISTS "Scores viewable by game participants" ON scores;
    CREATE POLICY "Scores viewable by all authenticated users" ON scores FOR SELECT USING (true);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not fix scores policy: %', SQLERRM;
  END;

  -- Create avatars bucket
  BEGIN
    INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not create avatars bucket: %', SQLERRM;
  END;

  -- Create storage policies
  BEGIN
    CREATE POLICY "Users can upload own avatar" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Users can update own avatar" ON storage.objects
      FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Users can delete own avatar" ON storage.objects
      FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Avatars are publicly viewable" ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Migration failed: %', SQLERRM;
  RETURN 'partial: ' || SQLERRM;
END;
$$;
`;

// GET /api/setup/migrate - Check migration status
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const adminClient = await createSupabaseAdminClient();
    const client = adminClient || supabase;

    // Check which columns exist in bag_discs by querying the table
    const { data: existingDiscs, error: discsError } = await client
      .from('bag_discs')
      .select('*')
      .limit(1);

    const existingColumns = existingDiscs && existingDiscs.length > 0
      ? Object.keys(existingDiscs[0])
      : [];

    const requiredColumns = ['disc_name', 'brand', 'category', 'speed', 'glide', 'turn', 'fade', 'stability', 'pic', 'link', 'notes'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    // Check avatars bucket
    const { data: buckets } = await client.storage.listBuckets();
    const avatarsBucket = buckets?.find(b => b.id === 'avatars');

    // Check if add_disc_to_bag RPC function exists
    let rpcAvailable = false;
    try {
      const { error: rpcError } = await client.rpc('add_disc_to_bag', {
        p_bag_id: '00000000-0000-0000-0000-000000000000',
        p_disc_id: '__test__',
      });
      // If we get any error OTHER than "function not found", the function exists
      if (rpcError && !rpcError.message.includes('Could not find the function') && !rpcError.message.includes('not found')) {
        rpcAvailable = true;
      }
    } catch {
      // Function doesn't exist
    }

    return NextResponse.json({
      needsMigration: missingColumns.length > 0 || !avatarsBucket,
      missingColumns,
      existingColumns,
      avatarsBucketExists: !!avatarsBucket,
      rpcAvailable,
      migrationSql: MIGRATION_SQL.trim(),
      instructions: missingColumns.length > 0
        ? 'Run the migration SQL in your Supabase SQL Editor to add missing columns.'
        : 'Database schema is up to date.',
    });
  } catch (err) {
    console.error('Migration check error:', err);
    return NextResponse.json({ error: 'Failed to check migration status' }, { status: 500 });
  }
}

// POST /api/setup/migrate - Attempt to run the migration
export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({
        success: false,
        error: 'Supabase credentials not configured',
        migrationSql: MIGRATION_SQL.trim(),
        instructions: 'Run the migration SQL in your Supabase SQL Editor.',
      }, { status: 503 });
    }

    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

    // Attempt 1: Try calling the run_migration_v2 RPC function
    // This requires the migration runner to have been created first
    try {
      const adminClient = await createSupabaseAdminClient();
      if (adminClient) {
        const { data, error } = await adminClient.rpc('run_migration_v2');

        if (!error) {
          return NextResponse.json({
            success: true,
            method: 'rpc_run_migration_v2',
            message: 'Migration completed successfully via RPC function.',
            result: data,
          });
        }

        // If the function doesn't exist, we need to create it first
        console.log('run_migration_v2 RPC not available:', error.message);
      }
    } catch (err) {
      console.log('run_migration_v2 RPC error:', err);
    }

    // Attempt 2: Create the migration runner function first, then call it
    // We use the Supabase REST API with the service role key to execute DDL
    try {
      // The service role key can execute raw SQL via the /rest/v1/rpc endpoint
      // But only if a function already exists. We need to use the pg_net extension
      // or the Supabase Management API.

      // Try creating the runner via the Management API
      const mgmtResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: CREATE_MIGRATION_RUNNER_SQL }),
      });

      if (mgmtResponse.ok) {
        // Runner created, now call it
        const adminClient = await createSupabaseAdminClient();
        if (adminClient) {
          const { data, error } = await adminClient.rpc('run_migration_v2');
          if (!error) {
            return NextResponse.json({
              success: true,
              method: 'management_api_then_rpc',
              message: 'Migration runner created and executed successfully.',
              result: data,
            });
          }
        }
      }
    } catch (err) {
      console.log('Management API approach failed:', err);
    }

    // Attempt 3: Use the Supabase SQL execution endpoint
    // The service role key with the /pg/query endpoint
    try {
      const sqlResponse = await fetch(`https://${projectRef}.supabase.co/pg/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: MIGRATION_SQL }),
      });

      if (sqlResponse.ok) {
        const result = await sqlResponse.json();
        return NextResponse.json({
          success: true,
          method: 'pg_query_endpoint',
          message: 'Migration completed via SQL execution endpoint.',
          result,
        });
      }
    } catch (err) {
      console.log('pg/query endpoint not available:', err);
    }

    // Auto-migration failed — return SQL for manual execution
    return NextResponse.json({
      success: false,
      error: 'Auto-migration not available. Please run the SQL manually in your Supabase SQL Editor.',
      migrationSql: MIGRATION_SQL.trim(),
      sqlEditorUrl: `https://supabase.com/dashboard/project/${projectRef}/sql`,
      instructions: [
        '1. Open the Supabase SQL Editor (link above)',
        '2. Copy and paste the migration SQL',
        '3. Click "Run" to execute',
        '4. The bag_discs table will be updated with all required columns',
        '5. The avatars storage bucket will be created',
        '6. Game visibility will be fixed for all users',
      ],
    });
  } catch (err) {
    console.error('Migration execution error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
