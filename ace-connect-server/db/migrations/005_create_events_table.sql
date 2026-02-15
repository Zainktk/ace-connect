-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  organizer_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date TIMESTAMP NOT NULL,
  location VARCHAR(255) NOT NULL,
  latitude FLOAT,
  longitude FLOAT,
  price DECIMAL(10, 2) DEFAULT 0,
  max_participants INTEGER,
  skill_level_min FLOAT,
  skill_level_max FLOAT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create event_participants table
CREATE TABLE IF NOT EXISTS event_participants (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'registered', -- registered, waitlisted, cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Policies for events
-- Everyone can read events
CREATE POLICY "Everyone can view events" ON events
  FOR SELECT USING (true);

-- Authenticated users can create events
CREATE POLICY "Authenticated users can create events" ON events
  FOR INSERT WITH CHECK (auth.uid() = organizer_id);

-- Organizers can update their own events
CREATE POLICY "Organizers can update own events" ON events
  FOR UPDATE USING (auth.uid() = organizer_id);

-- Organizers can delete their own events
CREATE POLICY "Organizers can delete own events" ON events
  FOR DELETE USING (auth.uid() = organizer_id);

-- Policies for event_participants
-- Participants can view their own registrations
CREATE POLICY "Users can view own registrations" ON event_participants
  FOR SELECT USING (auth.uid() = user_id);

-- Participants can join events
CREATE POLICY "Users can join events" ON event_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Participants can leave events
CREATE POLICY "Users can leave events" ON event_participants
  FOR DELETE USING (auth.uid() = user_id);
