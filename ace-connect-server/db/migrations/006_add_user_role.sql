-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'player' CHECK (role IN ('player', 'organizer', 'admin'));

-- Update existing users to be players (optional, as default handles new ones)
UPDATE users SET role = 'player' WHERE role IS NULL;
