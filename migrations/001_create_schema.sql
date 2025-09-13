-- Create dailyreminder schema
CREATE SCHEMA IF NOT EXISTS dailyreminder;

-- Set search path
SET search_path TO dailyreminder, public;

-- Create ENUM types
CREATE TYPE recurrence_type AS ENUM ('one_off', 'yearly', 'custom_interval');
CREATE TYPE recurrence_unit AS ENUM ('days', 'months', 'years');
CREATE TYPE digest_frequency AS ENUM ('daily', 'weekly');

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    recurrence_type recurrence_type NOT NULL DEFAULT 'one_off',
    recurrence_value INTEGER DEFAULT NULL,
    recurrence_unit recurrence_unit DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE
);

-- Recipients table
CREATE TABLE recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Event recipients junction table
CREATE TABLE event_recipients (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
    notification_lead_time INTEGER DEFAULT 24, -- hours before event
    PRIMARY KEY (event_id, recipient_id)
);

-- User settings table
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    timezone VARCHAR(100) DEFAULT 'Europe/Berlin',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    time_format VARCHAR(10) DEFAULT '24h',
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User digest preferences table
CREATE TABLE digest_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT TRUE,
    lookout_days INTEGER DEFAULT 7 CHECK (lookout_days IN (7, 14, 30, 60, 90)),
    frequency digest_frequency DEFAULT 'daily',
    timezone VARCHAR(100) DEFAULT 'Europe/Berlin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notification history table (for tracking sent notifications)
CREATE TABLE notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'event_reminder', 'digest'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'failed', 'pending'
    error_message TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_active ON events(active);
CREATE INDEX idx_events_recurrence ON events(recurrence_type);
CREATE INDEX idx_recipients_email ON recipients(email);
CREATE INDEX idx_digest_preferences_email ON digest_preferences(email);
CREATE INDEX idx_user_settings_email ON user_settings(email);
CREATE INDEX idx_notification_history_event ON notification_history(event_id);
CREATE INDEX idx_notification_history_sent_at ON notification_history(sent_at);

-- Create trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_digest_preferences_updated_at BEFORE UPDATE ON digest_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();