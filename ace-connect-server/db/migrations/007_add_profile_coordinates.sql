-- Add latitude and longitude to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS latitude FLOAT,
ADD COLUMN IF NOT EXISTS longitude FLOAT;
