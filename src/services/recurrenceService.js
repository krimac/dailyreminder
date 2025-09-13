const moment = require('moment-timezone');
const { Event } = require('../models');

class RecurrenceService {
    // Calculate all upcoming occurrences for an event within a time range
    static calculateUpcomingOccurrences(event, startDate, endDate, timezone = 'Europe/Berlin', maxOccurrences = 50) {
        const occurrences = [];

        if (event.recurrence_type === 'one_off') {
            const eventDate = moment.tz(event.event_date, timezone);
            if (eventDate.isBetween(startDate, endDate, null, '[]')) {
                occurrences.push({
                    date: eventDate.toDate(),
                    title: event.title,
                    description: event.description,
                    eventId: event.id,
                    occurrenceNumber: 1
                });
            }
            return occurrences;
        }

        const baseDate = moment.tz(event.event_date, timezone);
        const start = moment.tz(startDate, timezone);
        const end = moment.tz(endDate, timezone);

        let currentDate = baseDate.clone();
        let occurrenceCount = 0;

        // For yearly events
        if (event.recurrence_type === 'yearly') {
            // Start from the current year or the event's year, whichever is later
            const startYear = Math.max(start.year(), baseDate.year());

            for (let year = startYear; year <= end.year() && occurrenceCount < maxOccurrences; year++) {
                const occurrence = baseDate.clone().year(year);

                if (occurrence.isBetween(start, end, null, '[]')) {
                    occurrences.push({
                        date: occurrence.toDate(),
                        title: event.title,
                        description: event.description,
                        eventId: event.id,
                        occurrenceNumber: year - baseDate.year() + 1,
                        yearsSinceOriginal: year - baseDate.year()
                    });
                    occurrenceCount++;
                }
            }
        }

        // For custom interval events
        else if (event.recurrence_type === 'custom_interval' && event.recurrence_value && event.recurrence_unit) {
            // Move current date to first occurrence on or after start date
            while (currentDate.isBefore(start)) {
                currentDate.add(event.recurrence_value, event.recurrence_unit);
            }

            let intervalCount = 0;
            while (currentDate.isSameOrBefore(end) && occurrenceCount < maxOccurrences) {
                occurrences.push({
                    date: currentDate.toDate(),
                    title: event.title,
                    description: event.description,
                    eventId: event.id,
                    occurrenceNumber: intervalCount + 1,
                    intervalsSinceOriginal: intervalCount
                });

                currentDate.add(event.recurrence_value, event.recurrence_unit);
                occurrenceCount++;
                intervalCount++;
            }
        }

        return occurrences.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Get next occurrence for a single event
    static getNextOccurrence(event, timezone = 'Europe/Berlin') {
        const now = moment().tz(timezone);

        if (event.recurrence_type === 'one_off') {
            const eventDate = moment.tz(event.event_date, timezone);
            return eventDate.isAfter(now) ? eventDate.toDate() : null;
        }

        const baseDate = moment.tz(event.event_date, timezone);

        if (event.recurrence_type === 'yearly') {
            let nextOccurrence = baseDate.clone().year(now.year());

            // If this year's occurrence has passed, move to next year
            if (nextOccurrence.isSameOrBefore(now)) {
                nextOccurrence.add(1, 'year');
            }

            return nextOccurrence.toDate();
        }

        if (event.recurrence_type === 'custom_interval' && event.recurrence_value && event.recurrence_unit) {
            let nextOccurrence = baseDate.clone();

            // Keep adding intervals until we find a future date
            while (nextOccurrence.isSameOrBefore(now)) {
                nextOccurrence.add(event.recurrence_value, event.recurrence_unit);
            }

            return nextOccurrence.toDate();
        }

        return null;
    }

    // Get all events with their next occurrences
    static async getEventsWithNextOccurrences(timezone = 'Europe/Berlin', limit = 100) {
        try {
            const events = await Event.findAll({ active: true, limit });

            const eventsWithOccurrences = events.map(event => {
                const nextOccurrence = this.getNextOccurrence(event, timezone);
                return {
                    ...event.toJSON(),
                    nextOccurrence,
                    hasUpcomingOccurrence: nextOccurrence !== null
                };
            });

            // Sort by next occurrence date
            return eventsWithOccurrences
                .filter(event => event.nextOccurrence)
                .sort((a, b) => new Date(a.nextOccurrence) - new Date(b.nextOccurrence));

        } catch (error) {
            console.error('Error getting events with next occurrences:', error);
            throw error;
        }
    }

    // Get upcoming events for digest within specified days
    static async getUpcomingEventsForDigest(lookoutDays = 7, timezone = 'Europe/Berlin') {
        try {
            const now = moment().tz(timezone);
            const endDate = now.clone().add(lookoutDays, 'days');

            const events = await Event.findAll({ active: true });
            const upcomingOccurrences = [];

            for (const event of events) {
                const occurrences = this.calculateUpcomingOccurrences(
                    event,
                    now.toDate(),
                    endDate.toDate(),
                    timezone,
                    10 // Max 10 occurrences per event for digest
                );

                upcomingOccurrences.push(...occurrences);
            }

            // Sort by date and return
            return upcomingOccurrences
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map(occurrence => ({
                    ...occurrence,
                    daysFromNow: moment.tz(occurrence.date, timezone).diff(now, 'days'),
                    hoursFromNow: moment.tz(occurrence.date, timezone).diff(now, 'hours'),
                    formattedDate: moment.tz(occurrence.date, timezone).format('dddd, MMMM Do YYYY, h:mm A')
                }));

        } catch (error) {
            console.error('Error getting upcoming events for digest:', error);
            throw error;
        }
    }

    // Check for events needing notifications (based on lead time)
    static async getEventsNeedingNotification(timezone = 'Europe/Berlin') {
        try {
            const now = moment().tz(timezone);
            const events = await Event.findAll({ active: true });
            const eventsNeedingNotification = [];

            for (const event of events) {
                const eventWithRecipients = await Event.findWithRecipients(event.id);
                if (!eventWithRecipients || !eventWithRecipients.recipients) continue;

                const nextOccurrence = this.getNextOccurrence(event, timezone);
                if (!nextOccurrence) continue;

                const eventDate = moment.tz(nextOccurrence, timezone);

                // Check each recipient's notification lead time
                for (const recipient of eventWithRecipients.recipients) {
                    const leadTimeHours = recipient.notification_lead_time || 24;
                    const notificationTime = eventDate.clone().subtract(leadTimeHours, 'hours');

                    // Check if it's time to send notification (within 1 hour window)
                    if (now.isBetween(notificationTime, notificationTime.clone().add(1, 'hour'))) {
                        eventsNeedingNotification.push({
                            event: eventWithRecipients,
                            recipient: recipient,
                            eventDate: nextOccurrence,
                            notificationLeadTime: leadTimeHours,
                            shouldNotifyAt: notificationTime.toDate()
                        });
                    }
                }
            }

            return eventsNeedingNotification;

        } catch (error) {
            console.error('Error checking events needing notification:', error);
            throw error;
        }
    }

    // Calculate recurrence pattern summary for UI display
    static getRecurrenceDescription(event) {
        if (event.recurrence_type === 'one_off') {
            return 'Does not repeat';
        }

        if (event.recurrence_type === 'yearly') {
            return 'Repeats yearly';
        }

        if (event.recurrence_type === 'custom_interval' && event.recurrence_value && event.recurrence_unit) {
            const value = event.recurrence_value;
            const unit = event.recurrence_unit;

            if (value === 1) {
                return `Repeats every ${unit.slice(0, -1)}`; // Remove 's' from unit
            } else {
                return `Repeats every ${value} ${unit}`;
            }
        }

        return 'Unknown recurrence pattern';
    }

    // Validate recurrence settings
    static validateRecurrenceSettings(recurrence_type, recurrence_value, recurrence_unit) {
        if (recurrence_type === 'one_off') {
            return { valid: true };
        }

        if (recurrence_type === 'yearly') {
            return { valid: true };
        }

        if (recurrence_type === 'custom_interval') {
            if (!recurrence_value || !recurrence_unit) {
                return {
                    valid: false,
                    error: 'Custom interval requires both value and unit'
                };
            }

            if (recurrence_value < 1 || recurrence_value > 1000) {
                return {
                    valid: false,
                    error: 'Recurrence value must be between 1 and 1000'
                };
            }

            if (!['days', 'months', 'years'].includes(recurrence_unit)) {
                return {
                    valid: false,
                    error: 'Recurrence unit must be days, months, or years'
                };
            }

            return { valid: true };
        }

        return {
            valid: false,
            error: 'Invalid recurrence type'
        };
    }
}

module.exports = RecurrenceService;