const moment = require('moment-timezone');

class EmailTemplates {
    // Get common email styles
    static getBaseStyles() {
        return `
            <style>
                .email-container {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .email-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px 20px;
                    text-align: center;
                }
                .email-header h1 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 300;
                }
                .email-body {
                    padding: 30px 20px;
                    line-height: 1.6;
                    color: #333;
                }
                .event-card {
                    background-color: #f8f9fc;
                    border-left: 4px solid #667eea;
                    padding: 20px;
                    margin: 20px 0;
                    border-radius: 0 8px 8px 0;
                }
                .event-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #333;
                    margin: 0 0 10px 0;
                }
                .event-details {
                    color: #666;
                    font-size: 14px;
                    margin: 5px 0;
                }
                .event-description {
                    color: #555;
                    font-style: italic;
                    margin: 10px 0;
                }
                .button {
                    display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 12px 25px;
                    text-decoration: none;
                    border-radius: 25px;
                    margin: 20px 0;
                    font-weight: 500;
                }
                .footer {
                    background-color: #f8f9fc;
                    padding: 20px;
                    text-align: center;
                    border-top: 1px solid #eee;
                    color: #666;
                    font-size: 12px;
                }
                .highlight {
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 15px 0;
                }
                .urgent {
                    background-color: #f8d7da;
                    border: 1px solid #f1556c;
                    color: #721c24;
                }
                .success {
                    background-color: #d4edda;
                    border: 1px solid #27ae60;
                    color: #155724;
                }
                .count-badge {
                    background-color: #667eea;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: bold;
                }
            </style>
        `;
    }

    // Event reminder notification template
    static eventReminder(event, recipient, leadTime, timezone = 'Europe/Berlin') {
        const eventDate = moment.tz(event.event_date, timezone);
        const now = moment().tz(timezone);
        const timeUntil = eventDate.from(now);
        const formattedDate = eventDate.format('dddd, MMMM Do YYYY');
        const formattedTime = eventDate.format('h:mm A');

        // Determine urgency
        const hoursUntil = eventDate.diff(now, 'hours');
        const urgencyClass = hoursUntil <= 2 ? 'urgent' : hoursUntil <= 24 ? 'highlight' : '';

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Event Reminder: ${event.title}</title>
                ${this.getBaseStyles()}
            </head>
            <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
                <div class="email-container">
                    <div class="email-header">
                        <h1>📅 Event Reminder</h1>
                    </div>

                    <div class="email-body">
                        <p>Hello ${recipient.name || 'there'}!</p>

                        <p>This is a friendly reminder about your upcoming event:</p>

                        <div class="event-card ${urgencyClass}">
                            <div class="event-title">${event.title}</div>
                            ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
                            <div class="event-details">
                                📅 <strong>Date:</strong> ${formattedDate}<br>
                                🕐 <strong>Time:</strong> ${formattedTime}<br>
                                ⏰ <strong>Starts:</strong> ${timeUntil}
                            </div>
                            ${hoursUntil <= 2 ?
                                '<div style="margin-top: 15px; color: #721c24; font-weight: bold;">⚠️ Starting very soon!</div>' :
                                ''
                            }
                        </div>

                        ${event.recurrence_type !== 'one_off' ?
                            `<div class="highlight">
                                <strong>🔄 Recurring Event:</strong> ${this.getRecurrenceDescription(event)}
                            </div>` : ''
                        }

                        <p>We hope you have a great time at your event!</p>
                    </div>

                    <div class="footer">
                        <p>
                            This reminder was sent ${leadTime} hours before your event.<br>
                            Daily Reminder System • ${eventDate.format('YYYY-MM-DD HH:mm')} ${timezone}
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
Event Reminder: ${event.title}

Hello ${recipient.name || 'there'}!

This is a friendly reminder about your upcoming event:

${event.title}
${event.description ? event.description + '\n' : ''}
Date: ${formattedDate}
Time: ${formattedTime}
Starts: ${timeUntil}

${event.recurrence_type !== 'one_off' ?
    `Recurring Event: ${this.getRecurrenceDescription(event)}\n` : ''}

We hope you have a great time at your event!

This reminder was sent ${leadTime} hours before your event.
Daily Reminder System • ${eventDate.format('YYYY-MM-DD HH:mm')} ${timezone}
        `;

        return {
            subject: `📅 Reminder: ${event.title} ${timeUntil}`,
            html,
            text
        };
    }

    // Daily digest template
    static dailyDigest(events, user, lookoutDays, timezone = 'Europe/Berlin') {
        const now = moment().tz(timezone);
        const endDate = now.clone().add(lookoutDays, 'days');

        // Group events by day
        const eventsByDay = {};
        events.forEach(event => {
            const eventDate = moment.tz(event.date, timezone);
            const dayKey = eventDate.format('YYYY-MM-DD');
            if (!eventsByDay[dayKey]) {
                eventsByDay[dayKey] = [];
            }
            eventsByDay[dayKey].push(event);
        });

        const sortedDays = Object.keys(eventsByDay).sort();

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Daily Digest - ${lookoutDays} Days Ahead</title>
                ${this.getBaseStyles()}
            </head>
            <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
                <div class="email-container">
                    <div class="email-header">
                        <h1>📊 Daily Digest</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">
                            Your next ${lookoutDays} days • ${now.format('MMMM Do, YYYY')}
                        </p>
                    </div>

                    <div class="email-body">
                        <p>Hello ${user.name || user.email}!</p>

                        ${events.length === 0 ?
                            `<div class="success">
                                🎉 <strong>You're all clear!</strong><br>
                                No events scheduled for the next ${lookoutDays} days. Enjoy your free time!
                            </div>` :
                            `<p>Here's what's coming up in the next <span class="count-badge">${lookoutDays} days</span>:</p>

                            <div class="highlight">
                                📅 <strong>${events.length} event${events.length === 1 ? '' : 's'}</strong> scheduled
                                from ${now.format('MMM Do')} to ${endDate.format('MMM Do')}
                            </div>`
                        }

                        ${sortedDays.map(dayKey => {
                            const dayEvents = eventsByDay[dayKey];
                            const dayMoment = moment.tz(dayKey, timezone);
                            const isToday = dayMoment.isSame(now, 'day');
                            const isTomorrow = dayMoment.isSame(now.clone().add(1, 'day'), 'day');

                            let dayLabel = dayMoment.format('dddd, MMMM Do');
                            if (isToday) dayLabel = `Today, ${dayMoment.format('MMMM Do')}`;
                            else if (isTomorrow) dayLabel = `Tomorrow, ${dayMoment.format('MMMM Do')}`;

                            return `
                                <div style="margin: 25px 0;">
                                    <h3 style="color: #667eea; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 5px;">
                                        ${dayLabel} <span class="count-badge">${dayEvents.length}</span>
                                    </h3>
                                    ${dayEvents.map(event => `
                                        <div class="event-card">
                                            <div class="event-title">${event.title}</div>
                                            ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
                                            <div class="event-details">
                                                🕐 ${moment.tz(event.date, timezone).format('h:mm A')}
                                                ${event.occurrenceNumber > 1 ? `• 🔄 Occurrence #${event.occurrenceNumber}` : ''}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            `;
                        }).join('')}

                        ${events.length > 0 ?
                            '<p>Stay organized and never miss an important event! 📅</p>' :
                            '<p>Enjoy your upcoming free time! ✨</p>'
                        }
                    </div>

                    <div class="footer">
                        <p>
                            Daily Digest for ${user.email}<br>
                            Generated on ${now.format('dddd, MMMM Do YYYY [at] h:mm A')} ${timezone}<br>
                            Looking ahead ${lookoutDays} days
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
Daily Digest - ${lookoutDays} Days Ahead
${now.format('MMMM Do, YYYY')}

Hello ${user.name || user.email}!

${events.length === 0 ?
    `🎉 You're all clear! No events scheduled for the next ${lookoutDays} days.` :
    `Here's what's coming up in the next ${lookoutDays} days:

📅 ${events.length} event${events.length === 1 ? '' : 's'} scheduled from ${now.format('MMM Do')} to ${endDate.format('MMM Do')}

${sortedDays.map(dayKey => {
    const dayEvents = eventsByDay[dayKey];
    const dayMoment = moment.tz(dayKey, timezone);
    const isToday = dayMoment.isSame(now, 'day');
    const isTomorrow = dayMoment.isSame(now.clone().add(1, 'day'), 'day');

    let dayLabel = dayMoment.format('dddd, MMMM Do');
    if (isToday) dayLabel = `Today, ${dayMoment.format('MMMM Do')}`;
    else if (isTomorrow) dayLabel = `Tomorrow, ${dayMoment.format('MMMM Do')}`;

    return `
${dayLabel} (${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}):
${dayEvents.map(event =>
    `  • ${event.title} at ${moment.tz(event.date, timezone).format('h:mm A')}${event.description ? '\n    ' + event.description : ''}`
).join('\n')}`;
}).join('\n')}`
}

Stay organized and never miss an important event!

Daily Digest for ${user.email}
Generated on ${now.format('dddd, MMMM Do YYYY [at] h:mm A')} ${timezone}
        `;

        return {
            subject: `📊 Daily Digest - ${events.length} event${events.length === 1 ? '' : 's'} in the next ${lookoutDays} days`,
            html,
            text
        };
    }

    // Event created notification
    static eventCreated(event, recipient, timezone = 'Europe/Berlin') {
        const eventDate = moment.tz(event.event_date, timezone);
        const formattedDate = eventDate.format('dddd, MMMM Do YYYY');
        const formattedTime = eventDate.format('h:mm A');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>New Event Added: ${event.title}</title>
                ${this.getBaseStyles()}
            </head>
            <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
                <div class="email-container">
                    <div class="email-header">
                        <h1>✨ New Event Added</h1>
                    </div>

                    <div class="email-body">
                        <p>Hello ${recipient.name || 'there'}!</p>

                        <p>You've been added to a new event:</p>

                        <div class="event-card success">
                            <div class="event-title">${event.title}</div>
                            ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
                            <div class="event-details">
                                📅 <strong>Date:</strong> ${formattedDate}<br>
                                🕐 <strong>Time:</strong> ${formattedTime}
                            </div>
                        </div>

                        ${event.recurrence_type !== 'one_off' ?
                            `<div class="highlight">
                                <strong>🔄 Recurring Event:</strong> ${this.getRecurrenceDescription(event)}
                            </div>` : ''
                        }

                        <p>We'll send you a reminder before this event. Looking forward to seeing you there!</p>
                    </div>

                    <div class="footer">
                        <p>
                            Daily Reminder System<br>
                            Event created on ${moment().tz(timezone).format('dddd, MMMM Do YYYY [at] h:mm A')} ${timezone}
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
New Event Added: ${event.title}

Hello ${recipient.name || 'there'}!

You've been added to a new event:

${event.title}
${event.description ? event.description + '\n' : ''}
Date: ${formattedDate}
Time: ${formattedTime}

${event.recurrence_type !== 'one_off' ?
    `Recurring Event: ${this.getRecurrenceDescription(event)}\n` : ''}

We'll send you a reminder before this event. Looking forward to seeing you there!

Daily Reminder System
Event created on ${moment().tz(timezone).format('dddd, MMMM Do YYYY [at] h:mm A')} ${timezone}
        `;

        return {
            subject: `✨ New Event: ${event.title} - ${formattedDate}`,
            html,
            text
        };
    }

    // Event cancelled notification
    static eventCancelled(eventTitle, eventDate, recipient, timezone = 'Europe/Berlin') {
        const eventMoment = moment.tz(eventDate, timezone);
        const formattedDate = eventMoment.format('dddd, MMMM Do YYYY');
        const formattedTime = eventMoment.format('h:mm A');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Event Cancelled: ${eventTitle}</title>
                ${this.getBaseStyles()}
            </head>
            <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
                <div class="email-container">
                    <div class="email-header" style="background: linear-gradient(135deg, #f1556c 0%, #fd79a8 100%);">
                        <h1>❌ Event Cancelled</h1>
                    </div>

                    <div class="email-body">
                        <p>Hello ${recipient.name || 'there'}!</p>

                        <p>We wanted to let you know that the following event has been cancelled:</p>

                        <div class="event-card urgent">
                            <div class="event-title">${eventTitle}</div>
                            <div class="event-details">
                                📅 <strong>Was scheduled for:</strong> ${formattedDate}<br>
                                🕐 <strong>At:</strong> ${formattedTime}
                            </div>
                            <div style="margin-top: 15px; font-weight: bold;">
                                ⚠️ This event has been cancelled
                            </div>
                        </div>

                        <p>We apologize for any inconvenience this may cause. If you have any questions, please contact the event organizer.</p>
                    </div>

                    <div class="footer">
                        <p>
                            Daily Reminder System<br>
                            Cancellation notice sent on ${moment().tz(timezone).format('dddd, MMMM Do YYYY [at] h:mm A')} ${timezone}
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
Event Cancelled: ${eventTitle}

Hello ${recipient.name || 'there'}!

We wanted to let you know that the following event has been cancelled:

${eventTitle}
Was scheduled for: ${formattedDate} at ${formattedTime}

⚠️ This event has been cancelled

We apologize for any inconvenience this may cause. If you have any questions, please contact the event organizer.

Daily Reminder System
Cancellation notice sent on ${moment().tz(timezone).format('dddd, MMMM Do YYYY [at] h:mm A')} ${timezone}
        `;

        return {
            subject: `❌ Cancelled: ${eventTitle} - ${formattedDate}`,
            html,
            text
        };
    }

    // Helper method to get recurrence description
    static getRecurrenceDescription(event) {
        if (event.recurrence_type === 'yearly') {
            return 'Repeats yearly';
        }

        if (event.recurrence_type === 'custom_interval' && event.recurrence_value && event.recurrence_unit) {
            const value = event.recurrence_value;
            const unit = event.recurrence_unit;

            if (value === 1) {
                return `Repeats every ${unit.slice(0, -1)}`;
            } else {
                return `Repeats every ${value} ${unit}`;
            }
        }

        return 'One-time event';
    }
}

module.exports = EmailTemplates;