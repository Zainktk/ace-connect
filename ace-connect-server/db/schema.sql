-- AceConnect Database Schema

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table for user information
CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    ntrp_rating DECIMAL(2,1) CHECK (ntrp_rating >= 1.0 AND ntrp_rating <= 7.0),
    bio TEXT,
    location VARCHAR(255),
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Match requests table for finding partners
CREATE TABLE IF NOT EXISTS match_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_type VARCHAR(50) DEFAULT 'singles' CHECK (match_type IN ('singles', 'doubles')),
    preferred_date DATE,
    preferred_time TIME,
    location VARCHAR(255),
    skill_level_min DECIMAL(2,1) CHECK (skill_level_min >= 1.0 AND skill_level_min <= 7.0),
    skill_level_max DECIMAL(2,1) CHECK (skill_level_max >= 1.0 AND skill_level_max <= 7.0),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_skill_range CHECK (skill_level_min <= skill_level_max)
);

-- Match invitations table for connecting players
CREATE TABLE IF NOT EXISTS match_invitations (
    id SERIAL PRIMARY KEY,
    match_request_id INTEGER NOT NULL REFERENCES match_requests(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_users CHECK (sender_id != recipient_id)
);

-- Matches table for tracking tennis matches
CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    player1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_request_id INTEGER REFERENCES match_requests(id) ON DELETE SET NULL,
    match_type VARCHAR(50) DEFAULT 'singles' CHECK (match_type IN ('singles', 'doubles')),
    court_type VARCHAR(50) CHECK (court_type IN ('hard', 'clay', 'grass', 'indoor')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
    scheduled_time TIMESTAMP,
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_players CHECK (player1_id != player2_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_match_requests_user_id ON match_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_match_requests_status ON match_requests(status);
CREATE INDEX IF NOT EXISTS idx_match_requests_date ON match_requests(preferred_date);
CREATE INDEX IF NOT EXISTS idx_match_invitations_sender ON match_invitations(sender_id);
CREATE INDEX IF NOT EXISTS idx_match_invitations_recipient ON match_invitations(recipient_id);
CREATE INDEX IF NOT EXISTS idx_match_invitations_status ON match_invitations(status);
CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
