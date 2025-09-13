-- Set search path
SET search_path TO dailyreminder, public;

-- Insert sample recipients
INSERT INTO recipients (email, name) VALUES
    ('admin@example.com', 'Admin User'),
    ('user1@example.com', 'John Doe'),
    ('user2@example.com', 'Jane Smith')
ON CONFLICT (email) DO NOTHING;

-- Insert sample user settings
INSERT INTO user_settings (email, timezone, date_format, time_format, language) VALUES
    ('admin@example.com', 'Europe/Berlin', 'DD/MM/YYYY', '24h', 'en'),
    ('user1@example.com', 'Europe/Berlin', 'DD/MM/YYYY', '24h', 'en'),
    ('user2@example.com', 'America/New_York', 'MM/DD/YYYY', '12h', 'en')
ON CONFLICT (email) DO NOTHING;

-- Insert sample digest preferences
INSERT INTO digest_preferences (email, enabled, lookout_days, frequency, timezone) VALUES
    ('admin@example.com', TRUE, 7, 'daily', 'Europe/Berlin'),
    ('user1@example.com', TRUE, 14, 'daily', 'Europe/Berlin'),
    ('user2@example.com', FALSE, 30, 'weekly', 'America/New_York')
ON CONFLICT (email) DO NOTHING;

-- Insert sample events
INSERT INTO events (title, description, event_date, recurrence_type, recurrence_value, recurrence_unit) VALUES
    ('Team Meeting', 'Weekly team sync meeting', '2024-01-15 10:00:00+01:00', 'custom_interval', 7, 'days'),
    ('Birthday - John Doe', 'John''s birthday celebration', '2024-03-15 00:00:00+01:00', 'yearly', NULL, NULL),
    ('Project Deadline', 'Final submission for Q1 project', '2024-01-30 17:00:00+01:00', 'one_off', NULL, NULL),
    ('Monthly Review', 'Monthly performance review', '2024-01-31 14:00:00+01:00', 'custom_interval', 1, 'months');

-- Link events to recipients (using subqueries to get UUIDs)
INSERT INTO event_recipients (event_id, recipient_id, notification_lead_time)
SELECT
    e.id,
    r.id,
    24 -- 24 hours lead time
FROM events e, recipients r
WHERE e.title = 'Team Meeting' AND r.email IN ('admin@example.com', 'user1@example.com', 'user2@example.com');

INSERT INTO event_recipients (event_id, recipient_id, notification_lead_time)
SELECT
    e.id,
    r.id,
    48 -- 48 hours lead time for birthday
FROM events e, recipients r
WHERE e.title = 'Birthday - John Doe' AND r.email IN ('admin@example.com', 'user2@example.com');

INSERT INTO event_recipients (event_id, recipient_id, notification_lead_time)
SELECT
    e.id,
    r.id,
    72 -- 72 hours lead time for deadline
FROM events e, recipients r
WHERE e.title = 'Project Deadline' AND r.email = 'admin@example.com';

INSERT INTO event_recipients (event_id, recipient_id, notification_lead_time)
SELECT
    e.id,
    r.id,
    24 -- 24 hours lead time
FROM events e, recipients r
WHERE e.title = 'Monthly Review' AND r.email IN ('admin@example.com', 'user1@example.com');