-- Add pic and link columns to bag_discs table
-- pic: stores the DiscIt API flight path image URL
-- link: stores the Marshall Street disc detail link

ALTER TABLE bag_discs ADD COLUMN IF NOT EXISTS pic text;
ALTER TABLE bag_discs ADD COLUMN IF NOT EXISTS link text;
