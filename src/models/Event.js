const { pool } = require('../config/database');
const moment = require('moment-timezone');

class Event {
    constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.event_date = data.event_date;
        this.recurrence_type = data.recurrence_type;
        this.recurrence_value = data.recurrence_value;
        this.recurrence_unit = data.recurrence_unit;
        this.active = data.active;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create a new event
    static async create(eventData) {
        const query = `
            INSERT INTO events (title, description, event_date, recurrence_type, recurrence_value, recurrence_unit, active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            eventData.title,
            eventData.description,
            eventData.event_date,
            eventData.recurrence_type || 'one_off',
            eventData.recurrence_value,
            eventData.recurrence_unit,
            eventData.active !== undefined ? eventData.active : true
        ];

        try {
            const result = await pool.query(query, values);
            return new Event(result.rows[0]);
        } catch (err) {
            throw new Error(`Error creating event: ${err.message}`);
        }
    }

    // Find event by ID
    static async findById(id) {
        const query = 'SELECT * FROM events WHERE id = $1 AND active = true';

        try {
            const result = await pool.query(query, [id]);
            return result.rows.length > 0 ? new Event(result.rows[0]) : null;
        } catch (err) {
            throw new Error(`Error finding event: ${err.message}`);
        }
    }

    // Find all events
    static async findAll(options = {}) {
        let query = 'SELECT * FROM events WHERE active = true';
        const values = [];
        let paramIndex = 1;

        // Add filters
        if (options.startDate) {
            query += ` AND event_date >= $${paramIndex}`;
            values.push(options.startDate);
            paramIndex++;
        }

        if (options.endDate) {
            query += ` AND event_date <= $${paramIndex}`;
            values.push(options.endDate);
            paramIndex++;
        }

        if (options.recurrence_type) {
            query += ` AND recurrence_type = $${paramIndex}`;
            values.push(options.recurrence_type);
            paramIndex++;
        }

        // Add ordering
        query += ' ORDER BY event_date ASC';

        // Add limit
        if (options.limit) {
            query += ` LIMIT $${paramIndex}`;
            values.push(options.limit);
        }

        try {
            const result = await pool.query(query, values);
            return result.rows.map(row => new Event(row));
        } catch (err) {
            throw new Error(`Error finding events: ${err.message}`);
        }
    }

    // Update event
    async update(updateData) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        // Build dynamic update query
        Object.keys(updateData).forEach(key => {
            if (key !== 'id' && updateData[key] !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(updateData[key]);
                paramIndex++;
            }
        });

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        const query = `
            UPDATE events
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        values.push(this.id);

        try {
            const result = await pool.query(query, values);
            if (result.rows.length === 0) {
                throw new Error('Event not found');
            }

            // Update instance properties
            Object.assign(this, result.rows[0]);
            return this;
        } catch (err) {
            throw new Error(`Error updating event: ${err.message}`);
        }
    }

    // Soft delete event
    async delete() {
        const query = 'UPDATE events SET active = false WHERE id = $1 RETURNING *';

        try {
            const result = await pool.query(query, [this.id]);
            if (result.rows.length === 0) {
                throw new Error('Event not found');
            }
            this.active = false;
            return this;
        } catch (err) {
            throw new Error(`Error deleting event: ${err.message}`);
        }
    }

    // Get events with recipients
    static async findWithRecipients(eventId) {
        const query = `
            SELECT
                e.*,
                json_agg(
                    json_build_object(
                        'recipient_id', r.id,
                        'email', r.email,
                        'name', r.name,
                        'notification_lead_time', er.notification_lead_time
                    )
                ) FILTER (WHERE r.id IS NOT NULL) as recipients
            FROM events e
            LEFT JOIN event_recipients er ON e.id = er.event_id
            LEFT JOIN recipients r ON er.recipient_id = r.id
            WHERE e.id = $1 AND e.active = true
            GROUP BY e.id
        `;

        try {
            const result = await pool.query(query, [eventId]);
            if (result.rows.length === 0) {
                return null;
            }

            const eventData = result.rows[0];
            const event = new Event(eventData);
            event.recipients = eventData.recipients || [];
            return event;
        } catch (err) {
            throw new Error(`Error finding event with recipients: ${err.message}`);
        }
    }

    // Get upcoming events within a time range (for digest)
    static async getUpcoming(days = 7, timezone = 'Europe/Berlin') {
        const startDate = moment().tz(timezone).startOf('day');
        const endDate = moment().tz(timezone).add(days, 'days').endOf('day');

        const query = `
            SELECT e.*,
                   json_agg(
                       json_build_object(
                           'email', r.email,
                           'name', r.name,
                           'notification_lead_time', er.notification_lead_time
                       )
                   ) FILTER (WHERE r.id IS NOT NULL) as recipients
            FROM events e
            LEFT JOIN event_recipients er ON e.id = er.event_id
            LEFT JOIN recipients r ON er.recipient_id = r.id
            WHERE e.active = true
            AND e.event_date BETWEEN $1 AND $2
            GROUP BY e.id
            ORDER BY e.event_date ASC
        `;

        try {
            const result = await pool.query(query, [startDate.toISOString(), endDate.toISOString()]);
            return result.rows.map(row => {
                const event = new Event(row);
                event.recipients = row.recipients || [];
                return event;
            });
        } catch (err) {
            throw new Error(`Error getting upcoming events: ${err.message}`);
        }
    }

    // Calculate next occurrence for recurring events
    getNextOccurrence(timezone = 'Europe/Berlin') {
        if (this.recurrence_type === 'one_off') {
            return moment.tz(this.event_date, timezone);
        }

        const eventMoment = moment.tz(this.event_date, timezone);
        const now = moment().tz(timezone);

        if (this.recurrence_type === 'yearly') {
            let nextOccurrence = eventMoment.clone().year(now.year());

            // If this year's occurrence has passed, move to next year
            if (nextOccurrence.isBefore(now)) {
                nextOccurrence.add(1, 'year');
            }

            return nextOccurrence;
        }

        if (this.recurrence_type === 'custom_interval' && this.recurrence_value && this.recurrence_unit) {
            let nextOccurrence = eventMoment.clone();

            // Keep adding intervals until we find a future date
            while (nextOccurrence.isBefore(now)) {
                nextOccurrence.add(this.recurrence_value, this.recurrence_unit);
            }

            return nextOccurrence;
        }

        return eventMoment;
    }

    // Convert to JSON (for API responses)
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            event_date: this.event_date,
            recurrence_type: this.recurrence_type,
            recurrence_value: this.recurrence_value,
            recurrence_unit: this.recurrence_unit,
            active: this.active,
            created_at: this.created_at,
            updated_at: this.updated_at,
            recipients: this.recipients
        };
    }
}

module.exports = Event;