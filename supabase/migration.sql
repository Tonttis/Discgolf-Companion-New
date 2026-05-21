-- ============================================
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

-- Auto-create profile on signup (with robust username generation + error handling)
-- IMPORTANT: The EXCEPTION block ensures the trigger NEVER blocks user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  clean_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  -- Extract the part before @ from email
  base_username := LOWER(SPLIT_PART(NEW.email, '@', 1));

  -- Remove any character that isn't a-z, 0-9, or underscore
  clean_username := REGEXP_REPLACE(base_username, '[^a-z0-9_]', '', 'g');

  -- If the cleaned username is too short, use 'user' as base
  IF LENGTH(clean_username) < 3 THEN
    clean_username := 'user';
  END IF;

  -- Truncate to 20 chars
  clean_username := SUBSTRING(clean_username FROM 1 FOR 20);

  -- Check if username is taken, append number if needed
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
  -- NEVER fail user creation even if profile insert fails
  -- The app will create the profile via /api/auth/register as a fallback
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop any old/broken triggers before creating the correct one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_bag ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_bag();

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

-- 6. Disc bags
CREATE TABLE IF NOT EXISTS disc_bags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Päälaukku',
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- 7. Bag discs
CREATE TABLE IF NOT EXISTS bag_discs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_id UUID REFERENCES disc_bags(id) ON DELETE CASCADE NOT NULL,
  disc_id TEXT NOT NULL,
  disc_name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  speed NUMERIC,
  glide NUMERIC,
  turn NUMERIC,
  fade NUMERIC,
  stability TEXT,
  pic TEXT,
  link TEXT,
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bag_id, disc_id)
);

-- ============================================
-- SECURITY DEFINER helper functions
-- These bypass RLS for server-side operations where we verify ownership in the API
-- ============================================

-- Add disc to bag (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.add_disc_to_bag(
  p_bag_id UUID,
  p_disc_id TEXT,
  p_disc_name TEXT,
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
  result_id UUID;
BEGIN
  INSERT INTO public.bag_discs (bag_id, disc_id, disc_name, brand, category, speed, glide, turn, fade, stability, pic, link, notes)
  VALUES (p_bag_id, p_disc_id, p_disc_name, p_brand, p_category, p_speed, p_glide, p_turn, p_fade, p_stability, p_pic, p_link, p_notes)
  ON CONFLICT (bag_id, disc_id) DO UPDATE SET
    disc_name = EXCLUDED.disc_name,
    brand = EXCLUDED.brand,
    category = EXCLUDED.category,
    speed = EXCLUDED.speed,
    glide = EXCLUDED.glide,
    turn = EXCLUDED.turn,
    fade = EXCLUDED.fade,
    stability = EXCLUDED.stability,
    pic = EXCLUDED.pic,
    link = EXCLUDED.link,
    notes = EXCLUDED.notes
  RETURNING id INTO result_id;
  RETURN result_id;
END;
$$;

-- Remove disc from bag (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.remove_disc_from_bag(
  p_disc_row_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.bag_discs WHERE id = p_disc_row_id;
  RETURN FOUND;
END;
$$;

-- Update avatar URL (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.update_avatar_url(
  p_user_id UUID,
  p_avatar_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles SET avatar_url = p_avatar_url, updated_at = NOW() WHERE id = p_user_id;
END;
$$;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Profiles: anyone can read, users can insert/update their own
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

-- Favorites: users can read/write their own
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

-- Games: completed games visible to everyone, in_progress/abandoned only to players
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Games viewable by players" ON games FOR SELECT USING (
    status = 'completed'
    OR EXISTS (SELECT 1 FROM game_players WHERE game_id = games.id AND user_id = auth.uid())
    OR created_by = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can create games" ON games FOR INSERT WITH CHECK (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Game creator can update games" ON games FOR UPDATE USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM game_players WHERE game_id = games.id AND user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Game players: readable by anyone (needed for public game viewing)
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Game players viewable by everyone" ON game_players FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Game creator can add players" ON game_players FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM games WHERE id = game_players.game_id AND created_by = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Scores: readable by anyone (needed for public game viewing)
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Scores viewable by everyone" ON scores FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Players can insert own scores" ON scores FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Players can update own scores" ON scores FOR UPDATE USING (
    EXISTS (SELECT 1 FROM game_players WHERE id = scores.player_id AND user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Disc bags: users can manage their own bags
ALTER TABLE disc_bags ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own bags" ON disc_bags FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own bags" ON disc_bags FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own bags" ON disc_bags FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own bags" ON disc_bags FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Bag discs: users can manage discs in their own bags
ALTER TABLE bag_discs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own bag discs" ON bag_discs FOR SELECT USING (
    EXISTS (SELECT 1 FROM disc_bags WHERE id = bag_discs.bag_id AND user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own bag discs" ON bag_discs FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM disc_bags WHERE id = bag_discs.bag_id AND user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own bag discs" ON bag_discs FOR UPDATE USING (
    EXISTS (SELECT 1 FROM disc_bags WHERE id = bag_discs.bag_id AND user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own bag discs" ON bag_discs FOR DELETE USING (
    EXISTS (SELECT 1 FROM disc_bags WHERE id = bag_discs.bag_id AND user_id = auth.uid())
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
CREATE INDEX IF NOT EXISTS idx_disc_bags_user ON disc_bags(user_id);
CREATE INDEX IF NOT EXISTS idx_bag_discs_bag ON bag_discs(bag_id);

-- ============================================
-- Storage: Avatars bucket
-- ============================================
-- Run this in the Supabase SQL Editor or create via Dashboard:
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload their own avatars:
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Avatars are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
