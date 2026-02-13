-- AceConnect Database Schema - Final Comprehensive Version

-- 1. Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6),
    otp_expires_at TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Profiles table for user information
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

-- 3. Match requests table for finding partners
CREATE TABLE IF NOT EXISTS match_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_type VARCHAR(50) DEFAULT 'singles' CHECK (match_type IN ('singles', 'doubles')),
    preferred_date DATE,
    preferred_time TIME,
    location VARCHAR(255),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    skill_level_min DECIMAL(2,1) CHECK (skill_level_min >= 1.0 AND skill_level_min <= 7.0),
    skill_level_max DECIMAL(2,1) CHECK (skill_level_max >= 1.0 AND skill_level_max <= 7.0),
    court_type VARCHAR(50) DEFAULT 'any' CHECK (court_type IN ('hard', 'clay', 'grass', 'indoor', 'any')),
    preferred_time_range VARCHAR(50), -- e.g., 'morning', 'afternoon', 'evening'
    notes TEXT,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_skill_range CHECK (skill_level_min <= skill_level_max)
);

-- 4. Match invitations table for connecting players
CREATE TABLE IF NOT EXISTS match_invitations (
    id SERIAL PRIMARY KEY,
    match_request_id INTEGER NOT NULL REFERENCES match_requests(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_users_invitation CHECK (sender_id != recipient_id)
);

-- 5. Matches table for tracking tennis matches
CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    player1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_request_id INTEGER REFERENCES match_requests(id) ON DELETE SET NULL,
    match_type VARCHAR(50) DEFAULT 'singles' CHECK (match_type IN ('singles', 'doubles')),
    court_type VARCHAR(50) CHECK (court_type IN ('hard', 'clay', 'grass', 'indoor')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
    scheduled_time TIMESTAMP,
    match_date DATE, -- For historical records
    location VARCHAR(255),
    score VARCHAR(100), -- Store scores like "6-4, 6-2"
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_players CHECK (player1_id != player2_id)
);

-- 6. Match reviews table for ratings
CREATE TABLE IF NOT EXISTS match_reviews (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    category VARCHAR(50), -- e.g., 'sportsmanship', 'punctuality'
    feedback TEXT, -- Detailed comments
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_users_review CHECK (reviewer_id != subject_id),
    CONSTRAINT unique_match_reviewer UNIQUE (match_id, reviewer_id)
);

-- 7. Messages table for chat
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. User reports for moderation
CREATE TABLE IF NOT EXISTS user_reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(255) NOT NULL,
    details TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_users_report CHECK (reporter_id != reported_id)
);

-- 9. Blocked users
CREATE TABLE IF NOT EXISTS blocked_users (
    id SERIAL PRIMARY KEY,
    blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_users_block CHECK (blocker_id != blocked_id),
    CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
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
CREATE INDEX IF NOT EXISTS idx_match_reviews_subject ON match_reviews(subject_id);
CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_id);

-- Global Trigger Function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply Triggers
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
        CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_match_requests_updated_at') THEN
        CREATE TRIGGER update_match_requests_updated_at BEFORE UPDATE ON match_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_match_invitations_updated_at') THEN
        CREATE TRIGGER update_match_invitations_updated_at BEFORE UPDATE ON match_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_matches_updated_at') THEN
        CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
