const { pool } = require('../config/database');

class UserSettings {
    constructor(data) {
        this.id = data.id;
        this.email = data.email;
        this.timezone = data.timezone;
        this.date_format = data.date_format;
        this.time_format = data.time_format;
        this.language = data.language;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create or update user settings
    static async createOrUpdate(settingsData) {
        const query = `
            INSERT INTO user_settings (email, timezone, date_format, time_format, language)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email)
            DO UPDATE SET
                timezone = EXCLUDED.timezone,
                date_format = EXCLUDED.date_format,
                time_format = EXCLUDED.time_format,
                language = EXCLUDED.language,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const values = [
            settingsData.email,
            settingsData.timezone || 'Europe/Berlin',
            settingsData.date_format || 'DD/MM/YYYY',
            settingsData.time_format || '24h',
            settingsData.language || 'en'
        ];

        try {
            const result = await pool.query(query, values);
            return new UserSettings(result.rows[0]);
        } catch (err) {
            throw new Error(`Error creating/updating user settings: ${err.message}`);
        }
    }

    // Find settings by email
    static async findByEmail(email) {
        const query = 'SELECT * FROM user_settings WHERE email = $1';

        try {
            const result = await pool.query(query, [email]);
            return result.rows.length > 0 ? new UserSettings(result.rows[0]) : null;
        } catch (err) {
            throw new Error(`Error finding user settings: ${err.message}`);
        }
    }

    // Find settings by ID
    static async findById(id) {
        const query = 'SELECT * FROM user_settings WHERE id = $1';

        try {
            const result = await pool.query(query, [id]);
            return result.rows.length > 0 ? new UserSettings(result.rows[0]) : null;
        } catch (err) {
            throw new Error(`Error finding user settings: ${err.message}`);
        }
    }

    // Get all user settings
    static async findAll() {
        const query = 'SELECT * FROM user_settings ORDER BY email ASC';

        try {
            const result = await pool.query(query);
            return result.rows.map(row => new UserSettings(row));
        } catch (err) {
            throw new Error(`Error finding all user settings: ${err.message}`);
        }
    }

    // Update settings
    async update(updateData) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        // Build dynamic update query
        Object.keys(updateData).forEach(key => {
            if (key !== 'id' && key !== 'email' && updateData[key] !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(updateData[key]);
                paramIndex++;
            }
        });

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        const query = `
            UPDATE user_settings
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        values.push(this.id);

        try {
            const result = await pool.query(query, values);
            if (result.rows.length === 0) {
                throw new Error('User settings not found');
            }

            // Update instance properties
            Object.assign(this, result.rows[0]);
            return this;
        } catch (err) {
            throw new Error(`Error updating user settings: ${err.message}`);
        }
    }

    // Delete user settings
    async delete() {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Also delete digest preferences for this user
            await client.query('DELETE FROM digest_preferences WHERE email = $1', [this.email]);

            // Delete user settings
            const result = await client.query('DELETE FROM user_settings WHERE id = $1 RETURNING *', [this.id]);

            if (result.rows.length === 0) {
                throw new Error('User settings not found');
            }

            await client.query('COMMIT');
            return this;
        } catch (err) {
            await client.query('ROLLBACK');
            throw new Error(`Error deleting user settings: ${err.message}`);
        } finally {
            client.release();
        }
    }

    // Get user's digest preferences
    async getDigestPreferences() {
        const query = 'SELECT * FROM digest_preferences WHERE email = $1';

        try {
            const result = await pool.query(query, [this.email]);
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (err) {
            throw new Error(`Error getting digest preferences: ${err.message}`);
        }
    }

    // Create or update digest preferences for this user
    async createOrUpdateDigestPreferences(digestData) {
        const query = `
            INSERT INTO digest_preferences (email, enabled, lookout_days, frequency, timezone)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email)
            DO UPDATE SET
                enabled = EXCLUDED.enabled,
                lookout_days = EXCLUDED.lookout_days,
                frequency = EXCLUDED.frequency,
                timezone = EXCLUDED.timezone,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const values = [
            this.email,
            digestData.enabled !== undefined ? digestData.enabled : true,
            digestData.lookout_days || 7,
            digestData.frequency || 'daily',
            digestData.timezone || this.timezone
        ];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (err) {
            throw new Error(`Error creating/updating digest preferences: ${err.message}`);
        }
    }

    // Validate timezone
    static isValidTimezone(timezone) {
        try {
            Intl.DateTimeFormat(undefined, { timeZone: timezone });
            return true;
        } catch (err) {
            return false;
        }
    }

    // Validate date format
    static isValidDateFormat(format) {
        const validFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY', 'MM-DD-YYYY'];
        return validFormats.includes(format);
    }

    // Validate time format
    static isValidTimeFormat(format) {
        const validFormats = ['12h', '24h'];
        return validFormats.includes(format);
    }

    // Convert to JSON (for API responses)
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            timezone: this.timezone,
            date_format: this.date_format,
            time_format: this.time_format,
            language: this.language,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = UserSettings;