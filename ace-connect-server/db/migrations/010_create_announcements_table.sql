-- Create Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    icon VARCHAR(50) DEFAULT '🎾',
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed common announcements for 2026
INSERT INTO announcements (title, message, icon, start_date, end_date, priority) VALUES 
('RAMADAN BLESSED MONTH', 'Wishing you peace and joy this holy month. Check out local evening matches!', '🌙', '2026-02-18 00:00:00', '2026-03-20 00:00:00', 10),
('EID MUBARAK', 'Eid Mubarak! Celebrate with a friendly match on the court today.', '✨', '2026-03-20 00:00:00', '2026-03-23 00:00:00', 20),
('NEW YEAR CIRCUIT', 'Happy New Year! Start your 2026 goals with a fresh match request.', '🎆', '2026-01-01 00:00:00', '2026-01-05 00:00:00', 10),
('SUMMER SLAM', 'The heat is on! Stay hydrated and enjoy our summer tournament series.', '☀️', '2026-06-01 00:00:00', '2026-08-31 00:00:00', 5);
