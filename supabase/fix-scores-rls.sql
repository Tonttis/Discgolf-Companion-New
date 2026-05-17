-- ============================================
-- Fix: Scores RLS policies for multiplayer scoring
-- ============================================
-- Run this SQL in your Supabase SQL Editor to fix
-- the issue where player 1 cannot save scores for player 2.
--
-- Root cause: The INSERT/UPDATE policies on the scores table
-- only allow users to insert/update their OWN scores
-- (is_own_player_record). In a disc golf game, one player
-- typically keeps score for everyone.
--
-- Fix: Allow any game participant (creator or player) to
-- INSERT and UPDATE scores for ANY player in the game.
-- This is safe because the participant check ensures only
-- people in the game can modify scores.
-- ============================================

-- Drop the restrictive INSERT/UPDATE policies
DROP POLICY IF EXISTS "Players can insert own scores" ON scores;
DROP POLICY IF EXISTS "Players can update own scores" ON scores;

-- New INSERT policy: any game participant can insert scores for any player in the game
-- This allows player 1 to save scores for player 2
CREATE POLICY "Game participants can insert scores" ON scores
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      is_game_creator(game_id)
      OR is_game_participant(game_id)
    )
  );

-- New UPDATE policy: any game participant can update scores for any player in the game
-- This allows player 1 to update scores for player 2
CREATE POLICY "Game participants can update scores" ON scores
  FOR UPDATE USING (
    is_game_creator(game_id)
    OR is_game_participant(game_id)
  );
