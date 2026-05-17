-- ============================================
-- Fix: Infinite Recursion in RLS Policies
-- ============================================
-- Run this SQL in your Supabase SQL Editor to fix
-- the "infinite recursion detected in policy for
-- relation game_players" error (code 42P17).
--
-- Root cause: The game_players SELECT policy
-- references game_players itself (self-referencing)
-- and the games SELECT policy also references
-- game_players, creating mutual recursion.
--
-- Fix: Use SECURITY DEFINER functions to break
-- the circular dependency. These functions bypass
-- RLS because they execute with elevated privileges.
-- ============================================

-- Step 1: Drop existing problematic policies
-- ==========================================

DROP POLICY IF EXISTS "Games viewable by players" ON games;
DROP POLICY IF EXISTS "Game creator can update games" ON games;
DROP POLICY IF EXISTS "Game players viewable by game participants" ON game_players;
DROP POLICY IF EXISTS "Game creator can add players" ON game_players;
DROP POLICY IF EXISTS "Scores viewable by game participants" ON scores;
DROP POLICY IF EXISTS "Players can insert own scores" ON scores;
DROP POLICY IF EXISTS "Players can update own scores" ON scores;

-- Step 2: Create SECURITY DEFINER helper functions
-- These bypass RLS, breaking the recursion cycle
-- ==================================================

-- Check if the current user is a participant in a game
-- (reads game_players without triggering its RLS policy)
CREATE OR REPLACE FUNCTION is_game_participant(game_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM game_players
    WHERE game_id = game_uuid AND user_id = auth.uid()
  );
END;
$$;

-- Check if the current user created a game
-- (reads games without triggering its RLS policy)
CREATE OR REPLACE FUNCTION is_game_creator(game_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM games
    WHERE id = game_uuid AND created_by = auth.uid()
  );
END;
$$;

-- Check if a player record belongs to the current user
-- (reads game_players without triggering its RLS policy)
CREATE OR REPLACE FUNCTION is_own_player_record(player_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM game_players
    WHERE id = player_uuid AND user_id = auth.uid()
  );
END;
$$;

-- Step 3: Recreate policies using the helper functions
-- =====================================================

-- Games: readable by creator or game participants
CREATE POLICY "Games viewable by players" ON games
  FOR SELECT USING (
    created_by = auth.uid()
    OR is_game_participant(id)
  );

-- Games: authenticated users can create games
CREATE POLICY "Authenticated users can create games" ON games
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Games: creator or participants can update
CREATE POLICY "Game creator can update games" ON games
  FOR UPDATE USING (
    created_by = auth.uid()
    OR is_game_participant(id)
  );

-- Game players: readable by game creator or participants
CREATE POLICY "Game players viewable by game participants" ON game_players
  FOR SELECT USING (
    is_game_creator(game_id)
    OR is_game_participant(game_id)
    OR user_id = auth.uid()
  );

-- Game players: game creator can add players
CREATE POLICY "Game creator can add players" ON game_players
  FOR INSERT WITH CHECK (
    is_game_creator(game_id)
    OR user_id = auth.uid()
  );

-- Scores: readable by game participants
CREATE POLICY "Scores viewable by game participants" ON scores
  FOR SELECT USING (
    is_game_creator(game_id)
    OR is_game_participant(game_id)
  );

-- Scores: authenticated users can insert their own scores
CREATE POLICY "Players can insert own scores" ON scores
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_own_player_record(player_id)
  );

-- Scores: players can update their own scores
CREATE POLICY "Players can update own scores" ON scores
  FOR UPDATE USING (
    is_own_player_record(player_id)
  );
