const { Event, Recipient } = require('../models');
const Joi = require('joi');

// Validation schema for event creation
const eventSchema = Joi.object({
    title: Joi.string().required().max(255),
    description: Joi.string().allow('').max(1000),
    event_date: Joi.date().iso().required(),
    recurrence_type: Joi.string().valid('one_off', 'yearly', 'custom_interval').default('one_off'),
    recurrence_value: Joi.number().integer().min(1).when('recurrence_type', {
        is: 'custom_interval',
        then: Joi.required(),
        otherwise: Joi.allow(null)
    }),
    recurrence_unit: Joi.string().valid('days', 'months', 'years').when('recurrence_type', {
        is: 'custom_interval',
        then: Joi.required(),
        otherwise: Joi.allow(null)
    }),
    active: Joi.boolean().default(true),
    recipients: Joi.array().items(Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().allow(''),
        notification_lead_time: Joi.number().integer().min(0).default(24)
    })).default([])
});

// Validation schema for event updates
const eventUpdateSchema = Joi.object({
    title: Joi.string().max(255),
    description: Joi.string().allow('').max(1000),
    event_date: Joi.date().iso(),
    recurrence_type: Joi.string().valid('one_off', 'yearly', 'custom_interval'),
    recurrence_value: Joi.number().integer().min(1).allow(null),
    recurrence_unit: Joi.string().valid('days', 'months', 'years').allow(null),
    active: Joi.boolean()
});

class EventController {
    // Create a new event
    static async createEvent(req, res) {
        try {
            const { error, value } = eventSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    details: error.details
                });
            }

            const { recipients, ...eventData } = value;

            // Create the event
            const event = await Event.create(eventData);

            // Add recipients if provided
            if (recipients && recipients.length > 0) {
                for (const recipientData of recipients) {
                    // Create or get recipient
                    const recipient = await Recipient.create({
                        email: recipientData.email,
                        name: recipientData.name
                    });

                    // Link to event
                    await recipient.addToEvent(event.id, recipientData.notification_lead_time);
                }
            }

            // Fetch event with recipients for response
            const eventWithRecipients = await Event.findWithRecipients(event.id);

            res.status(201).json({
                success: true,
                message: 'Event created successfully',
                data: eventWithRecipients
            });
        } catch (err) {
            console.error('Error creating event:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Get all events
    static async getEvents(req, res) {
        try {
            const { startDate, endDate, recurrence_type, limit } = req.query;

            const options = {};
            if (startDate) options.startDate = new Date(startDate);
            if (endDate) options.endDate = new Date(endDate);
            if (recurrence_type) options.recurrence_type = recurrence_type;
            if (limit) options.limit = parseInt(limit);

            const events = await Event.findAll(options);

            res.json({
                success: true,
                message: 'Events retrieved successfully',
                data: events,
                count: events.length
            });
        } catch (err) {
            console.error('Error getting events:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Get event by ID
    static async getEventById(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Event ID is required'
                });
            }

            const event = await Event.findWithRecipients(id);

            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            res.json({
                success: true,
                message: 'Event retrieved successfully',
                data: event
            });
        } catch (err) {
            console.error('Error getting event by ID:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Update event
    static async updateEvent(req, res) {
        try {
            const { id } = req.params;
            const { error, value } = eventUpdateSchema.validate(req.body);

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    details: error.details
                });
            }

            const event = await Event.findById(id);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            const updatedEvent = await event.update(value);
            const eventWithRecipients = await Event.findWithRecipients(updatedEvent.id);

            res.json({
                success: true,
                message: 'Event updated successfully',
                data: eventWithRecipients
            });
        } catch (err) {
            console.error('Error updating event:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Delete event (soft delete)
    static async deleteEvent(req, res) {
        try {
            const { id } = req.params;

            const event = await Event.findById(id);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            await event.delete();

            res.json({
                success: true,
                message: 'Event deleted successfully'
            });
        } catch (err) {
            console.error('Error deleting event:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Get upcoming events (for digest)
    static async getUpcomingEvents(req, res) {
        try {
            const { days = 7, timezone = 'Europe/Berlin' } = req.query;

            const events = await Event.getUpcoming(parseInt(days), timezone);

            res.json({
                success: true,
                message: 'Upcoming events retrieved successfully',
                data: events,
                count: events.length,
                lookout_days: parseInt(days),
                timezone: timezone
            });
        } catch (err) {
            console.error('Error getting upcoming events:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }
}

module.exports = EventController;