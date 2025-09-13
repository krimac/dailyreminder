const { pool } = require('../config/database');

class Recipient {
    constructor(data) {
        this.id = data.id;
        this.email = data.email;
        this.name = data.name;
        this.created_at = data.created_at;
    }

    // Create a new recipient
    static async create(recipientData) {
        const query = `
            INSERT INTO recipients (email, name)
            VALUES ($1, $2)
            ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
            RETURNING *
        `;

        const values = [
            recipientData.email,
            recipientData.name
        ];

        try {
            const result = await pool.query(query, values);
            return new Recipient(result.rows[0]);
        } catch (err) {
            throw new Error(`Error creating recipient: ${err.message}`);
        }
    }

    // Find recipient by ID
    static async findById(id) {
        const query = 'SELECT * FROM recipients WHERE id = $1';

        try {
            const result = await pool.query(query, [id]);
            return result.rows.length > 0 ? new Recipient(result.rows[0]) : null;
        } catch (err) {
            throw new Error(`Error finding recipient: ${err.message}`);
        }
    }

    // Find recipient by email
    static async findByEmail(email) {
        const query = 'SELECT * FROM recipients WHERE email = $1';

        try {
            const result = await pool.query(query, [email]);
            return result.rows.length > 0 ? new Recipient(result.rows[0]) : null;
        } catch (err) {
            throw new Error(`Error finding recipient by email: ${err.message}`);
        }
    }

    // Find all recipients
    static async findAll(options = {}) {
        let query = 'SELECT * FROM recipients';
        const values = [];
        let paramIndex = 1;

        // Add search filter
        if (options.search) {
            query += ` WHERE (email ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`;
            values.push(`%${options.search}%`);
            paramIndex++;
        }

        // Add ordering
        query += ' ORDER BY name ASC, email ASC';

        // Add limit
        if (options.limit) {
            query += ` LIMIT $${paramIndex}`;
            values.push(options.limit);
        }

        try {
            const result = await pool.query(query, values);
            return result.rows.map(row => new Recipient(row));
        } catch (err) {
            throw new Error(`Error finding recipients: ${err.message}`);
        }
    }

    // Update recipient
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
            UPDATE recipients
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        values.push(this.id);

        try {
            const result = await pool.query(query, values);
            if (result.rows.length === 0) {
                throw new Error('Recipient not found');
            }

            // Update instance properties
            Object.assign(this, result.rows[0]);
            return this;
        } catch (err) {
            throw new Error(`Error updating recipient: ${err.message}`);
        }
    }

    // Delete recipient
    async delete() {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Remove from event_recipients first
            await client.query('DELETE FROM event_recipients WHERE recipient_id = $1', [this.id]);

            // Delete recipient
            const result = await client.query('DELETE FROM recipients WHERE id = $1 RETURNING *', [this.id]);

            if (result.rows.length === 0) {
                throw new Error('Recipient not found');
            }

            await client.query('COMMIT');
            return this;
        } catch (err) {
            await client.query('ROLLBACK');
            throw new Error(`Error deleting recipient: ${err.message}`);
        } finally {
            client.release();
        }
    }

    // Add recipient to event
    async addToEvent(eventId, notificationLeadTime = 24) {
        const query = `
            INSERT INTO event_recipients (event_id, recipient_id, notification_lead_time)
            VALUES ($1, $2, $3)
            ON CONFLICT (event_id, recipient_id)
            DO UPDATE SET notification_lead_time = EXCLUDED.notification_lead_time
            RETURNING *
        `;

        try {
            const result = await pool.query(query, [eventId, this.id, notificationLeadTime]);
            return result.rows[0];
        } catch (err) {
            throw new Error(`Error adding recipient to event: ${err.message}`);
        }
    }

    // Remove recipient from event
    async removeFromEvent(eventId) {
        const query = 'DELETE FROM event_recipients WHERE event_id = $1 AND recipient_id = $2 RETURNING *';

        try {
            const result = await pool.query(query, [eventId, this.id]);
            return result.rows.length > 0;
        } catch (err) {
            throw new Error(`Error removing recipient from event: ${err.message}`);
        }
    }

    // Get events for this recipient
    async getEvents(options = {}) {
        let query = `
            SELECT e.*, er.notification_lead_time
            FROM events e
            JOIN event_recipients er ON e.id = er.event_id
            WHERE er.recipient_id = $1 AND e.active = true
        `;

        const values = [this.id];
        let paramIndex = 2;

        // Add date filters
        if (options.startDate) {
            query += ` AND e.event_date >= $${paramIndex}`;
            values.push(options.startDate);
            paramIndex++;
        }

        if (options.endDate) {
            query += ` AND e.event_date <= $${paramIndex}`;
            values.push(options.endDate);
            paramIndex++;
        }

        query += ' ORDER BY e.event_date ASC';

        if (options.limit) {
            query += ` LIMIT $${paramIndex}`;
            values.push(options.limit);
        }

        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (err) {
            throw new Error(`Error getting recipient events: ${err.message}`);
        }
    }

    // Convert to JSON (for API responses)
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            name: this.name,
            created_at: this.created_at
        };
    }
}

module.exports = Recipient;