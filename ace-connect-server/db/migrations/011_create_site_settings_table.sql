-- Create Site Settings Table
CREATE TABLE IF NOT EXISTS site_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Branding and Defaults
INSERT INTO site_settings (key, value, category, description) VALUES 
('brand_name', 'ACE CONNECT', 'branding', 'Main application brand name'),
('brand_slogan', 'STRIVE FOR EXCELLENCE', 'branding', 'Official slogan in footer'),
('default_location', 'San Francisco, CA', 'general', 'Default location for profiles/requests'),
('dashboard_match_header', 'COURT COMMAND', 'ui', 'Header for the matches section on dashboard'),
('dashboard_find_match_title', 'FIND MATCH', 'ui', 'Title for the Find Match action card'),
('dashboard_browse_events_title', 'BROWSE EVENTS', 'ui', 'Title for the Events action card'),
('primary_sport_icon', '🎾', 'branding', 'Default sport icon used across the app'),
('no_sessions_message', 'No active sessions matching your form.', 'ui', 'Empty state message for matches'),
('pro_list_title', 'PRO LIST', 'ui', 'Header for the players directory');

-- Trigger to update updated_at
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_site_settings_updated_at') THEN
        CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
