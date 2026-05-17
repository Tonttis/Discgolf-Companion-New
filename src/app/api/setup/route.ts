import { NextRequest, NextResponse } from 'next/server';

// The fix SQL for existing installations that have RLS recursion issues
const FIX_SQL = `-- Fix: Infinite recursion in RLS policies for game_players
-- Run this in your Supabase SQL Editor if game creation fails with error 42P17

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "Games viewable by players" ON games;
DROP POLICY IF EXISTS "Authenticated users can create games" ON games;
DROP POLICY IF EXISTS "Game creator can update games" ON games;
DROP POLICY IF EXISTS "Game players viewable by game participants" ON game_players;
DROP POLICY IF EXISTS "Game creator can add players" ON game_players;
DROP POLICY IF EXISTS "Scores viewable by game participants" ON scores;
DROP POLICY IF EXISTS "Players can insert own scores" ON scores;
DROP POLICY IF EXISTS "Players can update own scores" ON scores;

-- 2. Create SECURITY DEFINER helper functions (bypass RLS, break recursion)
CREATE OR REPLACE FUNCTION is_game_participant(game_uuid UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM game_players WHERE game_id = game_uuid AND user_id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION is_game_creator(game_uuid UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM games WHERE id = game_uuid AND created_by = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION is_own_player_record(player_uuid UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM game_players WHERE id = player_uuid AND user_id = auth.uid());
END;
$$;

-- 3. Recreate policies using helper functions
CREATE POLICY "Games viewable by players" ON games FOR SELECT USING (
  created_by = auth.uid() OR is_game_participant(id)
);
CREATE POLICY "Authenticated users can create games" ON games FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Game creator can update games" ON games FOR UPDATE USING (
  created_by = auth.uid() OR is_game_participant(id)
);
CREATE POLICY "Game players viewable by game participants" ON game_players FOR SELECT USING (
  is_game_creator(game_id) OR is_game_participant(game_id) OR user_id = auth.uid()
);
CREATE POLICY "Game creator can add players" ON game_players FOR INSERT WITH CHECK (
  is_game_creator(game_id) OR user_id = auth.uid()
);
CREATE POLICY "Scores viewable by game participants" ON scores FOR SELECT USING (
  is_game_creator(game_id) OR is_game_participant(game_id)
);
CREATE POLICY "Players can insert own scores" ON scores FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND is_own_player_record(player_id)
);
CREATE POLICY "Players can update own scores" ON scores FOR UPDATE USING (
  is_own_player_record(player_id)
);
`;

const MIGRATION_SQL = `-- ============================================
-- DiscGolf Companion - Supabase Database Schema
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup (with robust username generation)
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  course_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_slug)
);

-- 3. Games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_slug TEXT NOT NULL,
  course_name TEXT NOT NULL,
  total_holes INT NOT NULL DEFAULT 0,
  total_par INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Game players
CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);

-- 5. Scores (throws per hole per player)
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES game_players(id) ON DELETE CASCADE NOT NULL,
  hole_number INT NOT NULL CHECK (hole_number > 0),
  throws INT NOT NULL DEFAULT 0 CHECK (throws >= 0),
  par INT,
  UNIQUE(game_id, player_id, hole_number)
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- NOTE: We use SECURITY DEFINER helper functions
-- to avoid infinite recursion between games ↔
-- game_players policies (Supabase error 42P17).
-- ============================================

-- Helper functions (bypass RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION is_game_participant(game_uuid UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM game_players WHERE game_id = game_uuid AND user_id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION is_game_creator(game_uuid UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM games WHERE id = game_uuid AND created_by = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION is_own_player_record(player_uuid UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM game_players WHERE id = player_uuid AND user_id = auth.uid());
END;
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Games viewable by players" ON games FOR SELECT USING (
    created_by = auth.uid() OR is_game_participant(id)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can create games" ON games FOR INSERT WITH CHECK (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Game creator can update games" ON games FOR UPDATE USING (
    created_by = auth.uid() OR is_game_participant(id)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Game players viewable by game participants" ON game_players FOR SELECT USING (
    is_game_creator(game_id) OR is_game_participant(game_id) OR user_id = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Game creator can add players" ON game_players FOR INSERT WITH CHECK (
    is_game_creator(game_id) OR user_id = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Scores viewable by game participants" ON scores FOR SELECT USING (
    is_game_creator(game_id) OR is_game_participant(game_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Players can insert own scores" ON scores FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND is_own_player_record(player_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Players can update own scores" ON scores FOR UPDATE USING (
    is_own_player_record(player_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_games_created_by ON games(created_by);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user ON game_players(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_game ON scores(game_id);
CREATE INDEX IF NOT EXISTS idx_scores_player ON scores(player_id);
`;

// Bag tables migration SQL
const BAG_MIGRATION_SQL = `-- ============================================
-- Disc Bag Tables - My Bag Feature
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. disc_bags table
CREATE TABLE IF NOT EXISTS disc_bags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Minun laukku',
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. bag_discs table (denormalized for performance)
CREATE TABLE IF NOT EXISTS bag_discs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_id UUID NOT NULL REFERENCES disc_bags(id) ON DELETE CASCADE,
  disc_id TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  speed INTEGER NOT NULL DEFAULT 0,
  glide INTEGER NOT NULL DEFAULT 0,
  turn INTEGER NOT NULL DEFAULT 0,
  fade INTEGER NOT NULL DEFAULT 0,
  stability TEXT NOT NULL DEFAULT '',
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bag_id, disc_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_disc_bags_user_id ON disc_bags(user_id);
CREATE INDEX IF NOT EXISTS idx_bag_discs_bag_id ON bag_discs(bag_id);
CREATE INDEX IF NOT EXISTS idx_bag_discs_category ON bag_discs(category);

-- RLS
ALTER TABLE disc_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_discs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own bags" ON disc_bags FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can create own bags" ON disc_bags FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own bags" ON disc_bags FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own bags" ON disc_bags FOR DELETE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can view own bag discs" ON bag_discs FOR SELECT USING (
    bag_id IN (SELECT id FROM disc_bags WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can add discs to own bags" ON bag_discs FOR INSERT WITH CHECK (
    bag_id IN (SELECT id FROM disc_bags WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete discs from own bags" ON bag_discs FOR DELETE USING (
    bag_id IN (SELECT id FROM disc_bags WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_disc_bags_updated_at ON disc_bags;
CREATE TRIGGER update_disc_bags_updated_at
  BEFORE UPDATE ON disc_bags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create primary bag for new users
CREATE OR REPLACE FUNCTION handle_new_user_bag()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO disc_bags (user_id, name, is_primary)
  VALUES (NEW.id, 'Minun laukku', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_bag ON auth.users;
CREATE TRIGGER on_auth_user_created_bag
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_bag();
`;

// GET /api/setup - Check database setup status
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        configured: false,
        status: 'not_configured',
        message: 'Supabase environment variables not set',
      });
    }

    // Check if profiles table exists by trying to query it
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    });

    // Try to check if tables exist by querying the profiles table
    const { error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    const profilesExist = !profilesError || profilesError.code !== 'PGRST205';

    if (!profilesExist) {
      return NextResponse.json({
        configured: true,
        status: 'needs_migration',
        message: 'Supabase is configured but database tables are not set up',
        dashboardUrl: `https://supabase.com/dashboard/project/${supabaseUrl.replace('https://', '').replace('.supabase.co', '')}/sql`,
        migrationSql: MIGRATION_SQL,
      });
    }

    // Tables exist - check if the INSERT policy is missing (common issue)
    // We try to detect this by checking if a profile can be inserted
    // For now, just return ready but also provide the fix SQL

    // Check if bag tables exist
    const { error: bagsError } = await supabase
      .from('disc_bags')
      .select('id')
      .limit(1);

    const bagTablesExist = !bagsError;

    return NextResponse.json({
      configured: true,
      status: bagTablesExist ? 'ready' : 'needs_bag_migration',
      message: bagTablesExist
        ? 'Database is set up and ready'
        : 'Core tables exist but bag tables need to be created',
      fixSql: FIX_SQL,
      bagMigrationSql: bagTablesExist ? undefined : BAG_MIGRATION_SQL,
      dashboardUrl: `https://supabase.com/dashboard/project/${supabaseUrl.replace('https://', '').replace('.supabase.co', '')}/sql`,
    });
  } catch (error) {
    return NextResponse.json({
      configured: false,
      status: 'error',
      message: 'Failed to check database status',
      error: String(error),
    });
  }
}
