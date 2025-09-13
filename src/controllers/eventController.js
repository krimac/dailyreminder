const { Event, Recipient } = require('../models');
const Joi = require('joi');
const socketService = require('../services/socketService');

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

            // Broadcast real-time event creation
            socketService.broadcastEventCreated(eventWithRecipients);

            // Notify specific recipients if they're connected
            if (eventWithRecipients.recipients && eventWithRecipients.recipients.length > 0) {
                const recipientEmails = eventWithRecipients.recipients.map(r => r.email);
                socketService.sendNotificationToUsers(recipientEmails, {
                    title: 'New Event Added',
                    message: `You've been added to the event: ${eventWithRecipients.title}`,
                    eventId: eventWithRecipients.id,
                    eventDate: eventWithRecipients.event_date
                });
            }

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

            // Broadcast real-time event update
            socketService.broadcastEventUpdated(eventWithRecipients);

            // Notify recipients of the update
            if (eventWithRecipients.recipients && eventWithRecipients.recipients.length > 0) {
                const recipientEmails = eventWithRecipients.recipients.map(r => r.email);
                socketService.sendNotificationToUsers(recipientEmails, {
                    title: 'Event Updated',
                    message: `The event "${eventWithRecipients.title}" has been updated`,
                    eventId: eventWithRecipients.id,
                    eventDate: eventWithRecipients.event_date
                });
            }

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

            const event = await Event.findWithRecipients(id);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            const eventTitle = event.title;
            const recipientEmails = event.recipients?.map(r => r.email) || [];

            await event.delete();

            // Broadcast real-time event deletion
            socketService.broadcastEventDeleted(id, eventTitle);

            // Notify recipients of the deletion
            if (recipientEmails.length > 0) {
                socketService.sendNotificationToUsers(recipientEmails, {
                    title: 'Event Cancelled',
                    message: `The event "${eventTitle}" has been cancelled`,
                    eventId: id
                });
            }

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

    // Bulk create events
    static async bulkCreateEvents(req, res) {
        try {
            const { events } = req.body;

            if (!events || !Array.isArray(events) || events.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Events array is required and must contain at least one event'
                });
            }

            const createdEvents = [];
            const errors = [];

            for (let i = 0; i < events.length; i++) {
                try {
                    const { error, value } = eventSchema.validate(events[i]);
                    if (error) {
                        errors.push({
                            index: i,
                            event: events[i],
                            error: error.details.map(d => d.message).join(', ')
                        });
                        continue;
                    }

                    const { recipients, ...eventData } = value;
                    const event = await Event.create(eventData);

                    // Add recipients if provided
                    if (recipients && recipients.length > 0) {
                        for (const recipientData of recipients) {
                            const recipient = await Recipient.create({
                                email: recipientData.email,
                                name: recipientData.name
                            });
                            await recipient.addToEvent(event.id, recipientData.notification_lead_time);
                        }
                    }

                    const eventWithRecipients = await Event.findWithRecipients(event.id);
                    createdEvents.push(eventWithRecipients);

                    // Broadcast real-time event creation
                    socketService.broadcastEventCreated(eventWithRecipients);

                } catch (eventError) {
                    errors.push({
                        index: i,
                        event: events[i],
                        error: eventError.message
                    });
                }
            }

            res.status(createdEvents.length > 0 ? 201 : 400).json({
                success: createdEvents.length > 0,
                message: `Bulk operation completed: ${createdEvents.length} created, ${errors.length} failed`,
                data: {
                    created: createdEvents,
                    errors: errors,
                    summary: {
                        total: events.length,
                        created: createdEvents.length,
                        failed: errors.length
                    }
                }
            });

        } catch (err) {
            console.error('Error in bulk create events:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Bulk update events
    static async bulkUpdateEvents(req, res) {
        try {
            const { updates } = req.body;

            if (!updates || !Array.isArray(updates) || updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Updates array is required and must contain at least one update'
                });
            }

            const updatedEvents = [];
            const errors = [];

            for (let i = 0; i < updates.length; i++) {
                try {
                    const { id, ...updateData } = updates[i];

                    if (!id) {
                        errors.push({
                            index: i,
                            update: updates[i],
                            error: 'Event ID is required'
                        });
                        continue;
                    }

                    const { error, value } = eventUpdateSchema.validate(updateData);
                    if (error) {
                        errors.push({
                            index: i,
                            update: updates[i],
                            error: error.details.map(d => d.message).join(', ')
                        });
                        continue;
                    }

                    const event = await Event.findById(id);
                    if (!event) {
                        errors.push({
                            index: i,
                            update: updates[i],
                            error: 'Event not found'
                        });
                        continue;
                    }

                    const updatedEvent = await event.update(value);
                    const eventWithRecipients = await Event.findWithRecipients(updatedEvent.id);
                    updatedEvents.push(eventWithRecipients);

                    // Broadcast real-time event update
                    socketService.broadcastEventUpdated(eventWithRecipients);

                } catch (updateError) {
                    errors.push({
                        index: i,
                        update: updates[i],
                        error: updateError.message
                    });
                }
            }

            res.json({
                success: updatedEvents.length > 0,
                message: `Bulk update completed: ${updatedEvents.length} updated, ${errors.length} failed`,
                data: {
                    updated: updatedEvents,
                    errors: errors,
                    summary: {
                        total: updates.length,
                        updated: updatedEvents.length,
                        failed: errors.length
                    }
                }
            });

        } catch (err) {
            console.error('Error in bulk update events:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Bulk delete events
    static async bulkDeleteEvents(req, res) {
        try {
            const { eventIds } = req.body;

            if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Event IDs array is required and must contain at least one ID'
                });
            }

            const deletedEvents = [];
            const errors = [];

            for (let i = 0; i < eventIds.length; i++) {
                try {
                    const eventId = eventIds[i];

                    const event = await Event.findWithRecipients(eventId);
                    if (!event) {
                        errors.push({
                            index: i,
                            eventId: eventId,
                            error: 'Event not found'
                        });
                        continue;
                    }

                    const eventTitle = event.title;
                    const recipientEmails = event.recipients?.map(r => r.email) || [];

                    await event.delete();
                    deletedEvents.push({ id: eventId, title: eventTitle });

                    // Broadcast real-time event deletion
                    socketService.broadcastEventDeleted(eventId, eventTitle);

                    // Notify recipients of the deletion
                    if (recipientEmails.length > 0) {
                        socketService.sendNotificationToUsers(recipientEmails, {
                            title: 'Event Cancelled',
                            message: `The event "${eventTitle}" has been cancelled`,
                            eventId: eventId
                        });
                    }

                } catch (deleteError) {
                    errors.push({
                        index: i,
                        eventId: eventIds[i],
                        error: deleteError.message
                    });
                }
            }

            res.json({
                success: deletedEvents.length > 0,
                message: `Bulk delete completed: ${deletedEvents.length} deleted, ${errors.length} failed`,
                data: {
                    deleted: deletedEvents,
                    errors: errors,
                    summary: {
                        total: eventIds.length,
                        deleted: deletedEvents.length,
                        failed: errors.length
                    }
                }
            });

        } catch (err) {
            console.error('Error in bulk delete events:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }
}

module.exports = EventController;