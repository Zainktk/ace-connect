-- Trust & Safety / Payments Migration
-- 1. Update Users table for Organizer Verification & Wallet
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_organizer_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10, 2) DEFAULT 0.00;

-- 2. Update Event Participants for Payment Tracking
ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'escrow', 'released', 'refunded', 'free'));
ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2) DEFAULT 0.00;

-- 3. Create Transactions table for Escrow management
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id), -- Player
    recipient_id INTEGER REFERENCES users(id), -- Organizer
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    fee_amount DECIMAL(10, 2) DEFAULT 0.00, -- Platform fee
    type VARCHAR(50) CHECK (type IN ('payment', 'payout', 'refund')),
    status VARCHAR(50) DEFAULT 'escrow' CHECK (status IN ('escrow', 'released', 'refunded', 'failed')),
    payout_at TIMESTAMP, -- Scheduled time to release funds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_event ON transactions(event_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_recipient ON transactions(recipient_id);
