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

-- Auto-create profile on signup (with robust username generation)
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

-- Profiles: anyone can read, users can insert/update their own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Favorites: users can read/write their own
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- Games: readable by game players, creatable by authenticated users
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Games viewable by players" ON games FOR SELECT USING (
  EXISTS (SELECT 1 FROM game_players WHERE game_id = games.id AND user_id = auth.uid())
  OR created_by = auth.uid()
);
CREATE POLICY "Authenticated users can create games" ON games FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Game creator can update games" ON games FOR UPDATE USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM game_players WHERE game_id = games.id AND user_id = auth.uid()));

-- Game players: readable by game participants
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Game players viewable by game participants" ON game_players FOR SELECT USING (
  EXISTS (SELECT 1 FROM games WHERE id = game_players.game_id AND (created_by = auth.uid() OR EXISTS (SELECT 1 FROM game_players gp WHERE gp.game_id = game_players.game_id AND gp.user_id = auth.uid())))
);
CREATE POLICY "Game creator can add players" ON game_players FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM games WHERE id = game_players.game_id AND created_by = auth.uid())
);

-- Scores: readable by game participants, writable by the player themselves or game creator
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scores viewable by game participants" ON scores FOR SELECT USING (
  EXISTS (SELECT 1 FROM games WHERE id = scores.game_id AND (created_by = auth.uid() OR EXISTS (SELECT 1 FROM game_players WHERE game_id = scores.game_id AND user_id = auth.uid())))
);
CREATE POLICY "Players can insert own scores" ON scores FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Players can update own scores" ON scores FOR UPDATE USING (
  EXISTS (SELECT 1 FROM game_players WHERE id = scores.player_id AND user_id = auth.uid())
);

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
