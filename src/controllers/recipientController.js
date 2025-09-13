const { Recipient } = require('../models');
const Joi = require('joi');

// Validation schema for recipient creation
const recipientSchema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().allow('').max(255)
});

// Validation schema for recipient updates
const recipientUpdateSchema = Joi.object({
    name: Joi.string().allow('').max(255)
});

class RecipientController {
    // Create a new recipient
    static async createRecipient(req, res) {
        try {
            const { error, value } = recipientSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    details: error.details
                });
            }

            const recipient = await Recipient.create(value);

            res.status(201).json({
                success: true,
                message: 'Recipient created successfully',
                data: recipient
            });
        } catch (err) {
            console.error('Error creating recipient:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Get all recipients
    static async getRecipients(req, res) {
        try {
            const { search, limit } = req.query;

            const options = {};
            if (search) options.search = search;
            if (limit) options.limit = parseInt(limit);

            const recipients = await Recipient.findAll(options);

            res.json({
                success: true,
                message: 'Recipients retrieved successfully',
                data: recipients,
                count: recipients.length
            });
        } catch (err) {
            console.error('Error getting recipients:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Get recipient by ID
    static async getRecipientById(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Recipient ID is required'
                });
            }

            const recipient = await Recipient.findById(id);

            if (!recipient) {
                return res.status(404).json({
                    success: false,
                    message: 'Recipient not found'
                });
            }

            res.json({
                success: true,
                message: 'Recipient retrieved successfully',
                data: recipient
            });
        } catch (err) {
            console.error('Error getting recipient by ID:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Get recipient by email
    static async getRecipientByEmail(req, res) {
        try {
            const { email } = req.params;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            const recipient = await Recipient.findByEmail(email);

            if (!recipient) {
                return res.status(404).json({
                    success: false,
                    message: 'Recipient not found'
                });
            }

            res.json({
                success: true,
                message: 'Recipient retrieved successfully',
                data: recipient
            });
        } catch (err) {
            console.error('Error getting recipient by email:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Update recipient
    static async updateRecipient(req, res) {
        try {
            const { id } = req.params;
            const { error, value } = recipientUpdateSchema.validate(req.body);

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    details: error.details
                });
            }

            const recipient = await Recipient.findById(id);
            if (!recipient) {
                return res.status(404).json({
                    success: false,
                    message: 'Recipient not found'
                });
            }

            const updatedRecipient = await recipient.update(value);

            res.json({
                success: true,
                message: 'Recipient updated successfully',
                data: updatedRecipient
            });
        } catch (err) {
            console.error('Error updating recipient:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Delete recipient
    static async deleteRecipient(req, res) {
        try {
            const { id } = req.params;

            const recipient = await Recipient.findById(id);
            if (!recipient) {
                return res.status(404).json({
                    success: false,
                    message: 'Recipient not found'
                });
            }

            await recipient.delete();

            res.json({
                success: true,
                message: 'Recipient deleted successfully'
            });
        } catch (err) {
            console.error('Error deleting recipient:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Get recipient's events
    static async getRecipientEvents(req, res) {
        try {
            const { id } = req.params;
            const { startDate, endDate, limit } = req.query;

            const recipient = await Recipient.findById(id);
            if (!recipient) {
                return res.status(404).json({
                    success: false,
                    message: 'Recipient not found'
                });
            }

            const options = {};
            if (startDate) options.startDate = new Date(startDate);
            if (endDate) options.endDate = new Date(endDate);
            if (limit) options.limit = parseInt(limit);

            const events = await recipient.getEvents(options);

            res.json({
                success: true,
                message: 'Recipient events retrieved successfully',
                data: events,
                count: events.length
            });
        } catch (err) {
            console.error('Error getting recipient events:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Add recipient to event
    static async addRecipientToEvent(req, res) {
        try {
            const { id } = req.params;
            const { eventId, notificationLeadTime = 24 } = req.body;

            if (!eventId) {
                return res.status(400).json({
                    success: false,
                    message: 'Event ID is required'
                });
            }

            const recipient = await Recipient.findById(id);
            if (!recipient) {
                return res.status(404).json({
                    success: false,
                    message: 'Recipient not found'
                });
            }

            const result = await recipient.addToEvent(eventId, notificationLeadTime);

            res.json({
                success: true,
                message: 'Recipient added to event successfully',
                data: result
            });
        } catch (err) {
            console.error('Error adding recipient to event:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Remove recipient from event
    static async removeRecipientFromEvent(req, res) {
        try {
            const { id, eventId } = req.params;

            const recipient = await Recipient.findById(id);
            if (!recipient) {
                return res.status(404).json({
                    success: false,
                    message: 'Recipient not found'
                });
            }

            const removed = await recipient.removeFromEvent(eventId);

            if (!removed) {
                return res.status(404).json({
                    success: false,
                    message: 'Recipient not associated with this event'
                });
            }

            res.json({
                success: true,
                message: 'Recipient removed from event successfully'
            });
        } catch (err) {
            console.error('Error removing recipient from event:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }
}

module.exports = RecipientController;