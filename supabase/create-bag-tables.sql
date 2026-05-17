-- Create disc_bags and bag_discs tables for the My Bag feature
-- Run this SQL in the Supabase SQL Editor

-- ==========================================
-- disc_bags: A user can have one or more bags
-- ==========================================
CREATE TABLE IF NOT EXISTS disc_bags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Minun laukku',
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- bag_discs: Discs in a bag (denormalized for performance)
-- ==========================================
CREATE TABLE IF NOT EXISTS bag_discs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_id UUID NOT NULL REFERENCES disc_bags(id) ON DELETE CASCADE,
  disc_id TEXT NOT NULL,           -- DiscIt API disc UUID
  name TEXT NOT NULL,              -- Disc name (e.g. "Buzzz")
  brand TEXT NOT NULL,             -- Brand (e.g. "Discraft")
  category TEXT NOT NULL,          -- Category (e.g. "Midrange")
  speed INTEGER NOT NULL DEFAULT 0,
  glide INTEGER NOT NULL DEFAULT 0,
  turn INTEGER NOT NULL DEFAULT 0,
  fade INTEGER NOT NULL DEFAULT 0,
  stability TEXT NOT NULL DEFAULT '', -- e.g. "Stable"
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent adding the same disc twice to the same bag
  UNIQUE(bag_id, disc_id)
);

-- ==========================================
-- Indexes
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_disc_bags_user_id ON disc_bags(user_id);
CREATE INDEX IF NOT EXISTS idx_bag_discs_bag_id ON bag_discs(bag_id);
CREATE INDEX IF NOT EXISTS idx_bag_discs_category ON bag_discs(category);

-- ==========================================
-- RLS Policies
-- ==========================================

ALTER TABLE disc_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_discs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own bags
CREATE POLICY "Users can view own bags" ON disc_bags
  FOR SELECT USING (user_id = auth.uid());

-- Users can only create bags for themselves
CREATE POLICY "Users can create own bags" ON disc_bags
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can only update their own bags
CREATE POLICY "Users can update own bags" ON disc_bags
  FOR UPDATE USING (user_id = auth.uid());

-- Users can only delete their own bags
CREATE POLICY "Users can delete own bags" ON disc_bags
  FOR DELETE USING (user_id = auth.uid());

-- Users can only see discs in their own bags
CREATE POLICY "Users can view own bag discs" ON bag_discs
  FOR SELECT USING (
    bag_id IN (SELECT id FROM disc_bags WHERE user_id = auth.uid())
  );

-- Users can only add discs to their own bags
CREATE POLICY "Users can add discs to own bags" ON bag_discs
  FOR INSERT WITH CHECK (
    bag_id IN (SELECT id FROM disc_bags WHERE user_id = auth.uid())
  );

-- Users can only delete discs from their own bags
CREATE POLICY "Users can delete discs from own bags" ON bag_discs
  FOR DELETE USING (
    bag_id IN (SELECT id FROM disc_bags WHERE user_id = auth.uid())
  );

-- ==========================================
-- Helper: Auto-update updated_at timestamp
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_disc_bags_updated_at
  BEFORE UPDATE ON disc_bags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Helper: Auto-create primary bag when user registers
-- ==========================================
CREATE OR REPLACE FUNCTION handle_new_user_bag()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO disc_bags (user_id, name, is_primary)
  VALUES (NEW.id, 'Minun laukku', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_bag'
  ) THEN
    CREATE TRIGGER on_auth_user_created_bag
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user_bag();
  END IF;
END
$$;
