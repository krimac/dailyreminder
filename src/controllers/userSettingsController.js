const { UserSettings } = require('../models');
const Joi = require('joi');

// Validation schema for user settings
const userSettingsSchema = Joi.object({
    email: Joi.string().email().required(),
    timezone: Joi.string().default('Europe/Berlin'),
    date_format: Joi.string().valid('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY', 'MM-DD-YYYY').default('DD/MM/YYYY'),
    time_format: Joi.string().valid('12h', '24h').default('24h'),
    language: Joi.string().min(2).max(10).default('en')
});

// Validation schema for digest preferences
const digestPreferencesSchema = Joi.object({
    enabled: Joi.boolean().default(true),
    lookout_days: Joi.number().valid(7, 14, 30, 60, 90).default(7),
    frequency: Joi.string().valid('daily', 'weekly').default('daily'),
    timezone: Joi.string().default('Europe/Berlin')
});

class UserSettingsController {
    // Create or update user settings
    static async createOrUpdateSettings(req, res) {
        try {
            const { error, value } = userSettingsSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    details: error.details
                });
            }

            // Validate timezone
            if (value.timezone && !UserSettings.isValidTimezone(value.timezone)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid timezone provided'
                });
            }

            const settings = await UserSettings.createOrUpdate(value);

            res.json({
                success: true,
                message: 'User settings saved successfully',
                data: settings
            });
        } catch (err) {
            console.error('Error creating/updating user settings:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Get user settings by email
    static async getSettingsByEmail(req, res) {
        try {
            const { email } = req.params;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            const settings = await UserSettings.findByEmail(email);

            if (!settings) {
                return res.status(404).json({
                    success: false,
                    message: 'User settings not found'
                });
            }

            // Also get digest preferences
            const digestPreferences = await settings.getDigestPreferences();

            res.json({
                success: true,
                message: 'User settings retrieved successfully',
                data: {
                    ...settings.toJSON(),
                    digest_preferences: digestPreferences
                }
            });
        } catch (err) {
            console.error('Error getting user settings:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Get user settings by ID
    static async getSettingsById(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Settings ID is required'
                });
            }

            const settings = await UserSettings.findById(id);

            if (!settings) {
                return res.status(404).json({
                    success: false,
                    message: 'User settings not found'
                });
            }

            // Also get digest preferences
            const digestPreferences = await settings.getDigestPreferences();

            res.json({
                success: true,
                message: 'User settings retrieved successfully',
                data: {
                    ...settings.toJSON(),
                    digest_preferences: digestPreferences
                }
            });
        } catch (err) {
            console.error('Error getting user settings by ID:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Get all user settings
    static async getAllSettings(req, res) {
        try {
            const settings = await UserSettings.findAll();

            res.json({
                success: true,
                message: 'All user settings retrieved successfully',
                data: settings,
                count: settings.length
            });
        } catch (err) {
            console.error('Error getting all user settings:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Update user settings
    static async updateSettings(req, res) {
        try {
            const { id } = req.params;

            // Remove email from update data (it shouldn't be updated)
            const { email, ...updateData } = req.body;

            const settings = await UserSettings.findById(id);
            if (!settings) {
                return res.status(404).json({
                    success: false,
                    message: 'User settings not found'
                });
            }

            // Validate timezone if provided
            if (updateData.timezone && !UserSettings.isValidTimezone(updateData.timezone)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid timezone provided'
                });
            }

            const updatedSettings = await settings.update(updateData);

            res.json({
                success: true,
                message: 'User settings updated successfully',
                data: updatedSettings
            });
        } catch (err) {
            console.error('Error updating user settings:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Delete user settings
    static async deleteSettings(req, res) {
        try {
            const { id } = req.params;

            const settings = await UserSettings.findById(id);
            if (!settings) {
                return res.status(404).json({
                    success: false,
                    message: 'User settings not found'
                });
            }

            await settings.delete();

            res.json({
                success: true,
                message: 'User settings deleted successfully'
            });
        } catch (err) {
            console.error('Error deleting user settings:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Create or update digest preferences
    static async updateDigestPreferences(req, res) {
        try {
            const { email } = req.params;
            const { error, value } = digestPreferencesSchema.validate(req.body);

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    details: error.details
                });
            }

            // Validate timezone
            if (value.timezone && !UserSettings.isValidTimezone(value.timezone)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid timezone provided'
                });
            }

            // Find or create user settings first
            let settings = await UserSettings.findByEmail(email);
            if (!settings) {
                settings = await UserSettings.createOrUpdate({ email });
            }

            const digestPreferences = await settings.createOrUpdateDigestPreferences(value);

            res.json({
                success: true,
                message: 'Digest preferences updated successfully',
                data: digestPreferences
            });
        } catch (err) {
            console.error('Error updating digest preferences:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Get available timezones
    static async getTimezones(req, res) {
        try {
            const commonTimezones = [
                'Europe/Berlin',
                'Europe/London',
                'America/New_York',
                'America/Los_Angeles',
                'America/Chicago',
                'Asia/Tokyo',
                'Asia/Shanghai',
                'Australia/Sydney',
                'UTC'
            ];

            res.json({
                success: true,
                message: 'Available timezones retrieved successfully',
                data: {
                    common: commonTimezones,
                    all: Intl.supportedValuesOf('timeZone')
                }
            });
        } catch (err) {
            console.error('Error getting timezones:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }
}

module.exports = UserSettingsController;