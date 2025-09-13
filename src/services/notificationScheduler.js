const cron = require('node-cron');
const moment = require('moment-timezone');
const emailService = require('./emailService');
const RecurrenceService = require('./recurrenceService');
const { Event, UserSettings } = require('../models');
const { pool } = require('../config/database');

class NotificationScheduler {
    constructor() {
        this.jobs = new Map();
        this.isRunning = false;
        this.stats = {
            totalChecks: 0,
            notificationsSent: 0,
            digestsSent: 0,
            lastCheck: null,
            errors: 0
        };
    }

    // Initialize scheduler
    async init() {
        try {
            console.log('⏰ Initializing notification scheduler...');

            // Initialize email service first
            await emailService.init();

            // Schedule notification checks every 15 minutes
            this.scheduleNotificationChecks();

            // Schedule daily digest at 8:00 AM CET
            this.scheduleDailyDigests();

            // Schedule cleanup job daily at 2:00 AM CET
            this.scheduleCleanup();

            this.isRunning = true;
            console.log('✅ Notification scheduler started successfully');

            // Run initial check
            setTimeout(() => this.checkPendingNotifications(), 5000);

            return true;

        } catch (error) {
            console.error('❌ Notification scheduler initialization failed:', error.message);
            return false;
        }
    }

    // Schedule periodic notification checks
    scheduleNotificationChecks() {
        // Every 15 minutes: check for pending notifications
        const notificationJob = cron.schedule('*/15 * * * *', async () => {
            await this.checkPendingNotifications();
        }, {
            scheduled: false,
            timezone: 'Europe/Berlin'
        });

        this.jobs.set('notifications', notificationJob);
        notificationJob.start();

        console.log('📋 Scheduled notification checks every 15 minutes');
    }

    // Schedule daily digest emails
    scheduleDailyDigests() {
        // Daily at 8:00 AM CET: send daily digests
        const digestJob = cron.schedule('0 8 * * *', async () => {
            await this.sendDailyDigests();
        }, {
            scheduled: false,
            timezone: 'Europe/Berlin'
        });

        this.jobs.set('digests', digestJob);
        digestJob.start();

        console.log('📊 Scheduled daily digests at 8:00 AM CET');
    }

    // Schedule cleanup tasks
    scheduleCleanup() {
        // Daily at 2:00 AM CET: cleanup old notifications
        const cleanupJob = cron.schedule('0 2 * * *', async () => {
            await this.cleanupOldNotifications();
        }, {
            scheduled: false,
            timezone: 'Europe/Berlin'
        });

        this.jobs.set('cleanup', cleanupJob);
        cleanupJob.start();

        console.log('🧹 Scheduled daily cleanup at 2:00 AM CET');
    }

    // Check for events that need notifications
    async checkPendingNotifications() {
        if (!emailService.getStatus().configured) {
            console.log('⚠️  Skipping notification check - email not configured');
            return;
        }

        try {
            this.stats.totalChecks++;
            this.stats.lastCheck = new Date();

            console.log('🔍 Checking for pending notifications...');

            const eventsNeedingNotification = await RecurrenceService.getEventsNeedingNotification('Europe/Berlin');

            if (eventsNeedingNotification.length === 0) {
                console.log('✅ No pending notifications found');
                return;
            }

            console.log(`📬 Found ${eventsNeedingNotification.length} notification(s) to send`);

            let successCount = 0;
            let errorCount = 0;

            for (const notification of eventsNeedingNotification) {
                try {
                    console.log(`📧 Sending reminder for "${notification.event.title}" to ${notification.recipient.email}`);

                    await emailService.sendEventReminder(
                        notification.event,
                        notification.recipient,
                        notification.notificationLeadTime,
                        'Europe/Berlin'
                    );

                    successCount++;

                } catch (error) {
                    console.error(`❌ Failed to send reminder for "${notification.event.title}":`, error.message);
                    errorCount++;
                }
            }

            this.stats.notificationsSent += successCount;
            this.stats.errors += errorCount;

            console.log(`✅ Notification check complete: ${successCount} sent, ${errorCount} failed`);

        } catch (error) {
            console.error('❌ Error in notification check:', error.message);
            this.stats.errors++;
        }
    }

    // Send daily digests to all enabled users
    async sendDailyDigests() {
        if (!emailService.getStatus().configured) {
            console.log('⚠️  Skipping daily digests - email not configured');
            return;
        }

        try {
            console.log('📊 Sending daily digests...');

            // Get all users with enabled digest preferences
            const query = `
                SELECT dp.*, us.name
                FROM digest_preferences dp
                LEFT JOIN user_settings us ON dp.email = us.email
                WHERE dp.enabled = true AND dp.frequency = 'daily'
            `;

            const result = await pool.query(query);
            const users = result.rows;

            if (users.length === 0) {
                console.log('📪 No users configured for daily digests');
                return;
            }

            console.log(`📬 Sending digests to ${users.length} user(s)`);

            let successCount = 0;
            let errorCount = 0;

            for (const user of users) {
                try {
                    const timezone = user.timezone || 'Europe/Berlin';
                    const lookoutDays = user.lookout_days || 7;

                    // Get upcoming events for this user's timeframe
                    const upcomingEvents = await RecurrenceService.getUpcomingEventsForDigest(
                        lookoutDays,
                        timezone
                    );

                    // Filter events that include this user as a recipient
                    const userEvents = [];
                    for (const occurrence of upcomingEvents) {
                        const eventWithRecipients = await Event.findWithRecipients(occurrence.eventId);
                        if (eventWithRecipients && eventWithRecipients.recipients) {
                            const isRecipient = eventWithRecipients.recipients.some(r => r.email === user.email);
                            if (isRecipient) {
                                userEvents.push(occurrence);
                            }
                        }
                    }

                    console.log(`📧 Sending digest to ${user.email} (${userEvents.length} events)`);

                    await emailService.sendDailyDigest(
                        userEvents,
                        user.email,
                        user,
                        lookoutDays
                    );

                    successCount++;

                } catch (error) {
                    console.error(`❌ Failed to send digest to ${user.email}:`, error.message);
                    errorCount++;
                }
            }

            this.stats.digestsSent += successCount;
            this.stats.errors += errorCount;

            console.log(`✅ Daily digest complete: ${successCount} sent, ${errorCount} failed`);

        } catch (error) {
            console.error('❌ Error in daily digest process:', error.message);
            this.stats.errors++;
        }
    }

    // Send weekly digests (can be called separately or scheduled)
    async sendWeeklyDigests() {
        if (!emailService.getStatus().configured) {
            console.log('⚠️  Skipping weekly digests - email not configured');
            return;
        }

        try {
            console.log('📅 Sending weekly digests...');

            // Get all users with enabled weekly digest preferences
            const query = `
                SELECT dp.*, us.name
                FROM digest_preferences dp
                LEFT JOIN user_settings us ON dp.email = us.email
                WHERE dp.enabled = true AND dp.frequency = 'weekly'
            `;

            const result = await pool.query(query);
            const users = result.rows;

            if (users.length === 0) {
                console.log('📪 No users configured for weekly digests');
                return;
            }

            let successCount = 0;
            let errorCount = 0;

            for (const user of users) {
                try {
                    const timezone = user.timezone || 'Europe/Berlin';
                    const lookoutDays = user.lookout_days || 14; // Default to 2 weeks for weekly digest

                    const upcomingEvents = await RecurrenceService.getUpcomingEventsForDigest(
                        lookoutDays,
                        timezone
                    );

                    // Filter events for this user
                    const userEvents = [];
                    for (const occurrence of upcomingEvents) {
                        const eventWithRecipients = await Event.findWithRecipients(occurrence.eventId);
                        if (eventWithRecipients && eventWithRecipients.recipients) {
                            const isRecipient = eventWithRecipients.recipients.some(r => r.email === user.email);
                            if (isRecipient) {
                                userEvents.push(occurrence);
                            }
                        }
                    }

                    await emailService.sendDailyDigest(
                        userEvents,
                        user.email,
                        user,
                        lookoutDays
                    );

                    successCount++;

                } catch (error) {
                    console.error(`❌ Failed to send weekly digest to ${user.email}:`, error.message);
                    errorCount++;
                }
            }

            this.stats.digestsSent += successCount;
            this.stats.errors += errorCount;

            console.log(`✅ Weekly digest complete: ${successCount} sent, ${errorCount} failed`);

        } catch (error) {
            console.error('❌ Error in weekly digest process:', error.message);
            this.stats.errors++;
        }
    }

    // Cleanup old notification history
    async cleanupOldNotifications(daysToKeep = 90) {
        try {
            console.log(`🧹 Cleaning up notification history older than ${daysToKeep} days...`);

            const query = `
                DELETE FROM notification_history
                WHERE sent_at < NOW() - INTERVAL '${daysToKeep} days'
            `;

            const result = await pool.query(query);
            const deletedCount = result.rowCount;

            console.log(`✅ Cleanup complete: removed ${deletedCount} old notification records`);
            return deletedCount;

        } catch (error) {
            console.error('❌ Error in cleanup process:', error.message);
            throw error;
        }
    }

    // Send immediate notification for event (called from controllers)
    async sendImmediateEventNotification(event, recipients, notificationType = 'event_created') {
        if (!emailService.getStatus().configured) {
            console.log('⚠️  Email not configured - skipping immediate notification');
            return { sent: 0, failed: recipients.length };
        }

        let successCount = 0;
        let errorCount = 0;

        for (const recipient of recipients) {
            try {
                if (notificationType === 'event_created') {
                    await emailService.sendEventCreatedNotification(event, recipient);
                } else if (notificationType === 'event_cancelled') {
                    await emailService.sendEventCancelledNotification(
                        event.id,
                        event.title,
                        event.event_date,
                        recipient
                    );
                }
                successCount++;
            } catch (error) {
                console.error(`❌ Failed to send ${notificationType} notification to ${recipient.email}:`, error.message);
                errorCount++;
            }
        }

        return { sent: successCount, failed: errorCount };
    }

    // Get scheduler statistics
    getStats() {
        return {
            ...this.stats,
            isRunning: this.isRunning,
            activeJobs: Array.from(this.jobs.keys()),
            emailServiceStatus: emailService.getStatus()
        };
    }

    // Stop all scheduled jobs
    stop() {
        console.log('⏹️  Stopping notification scheduler...');

        this.jobs.forEach((job, name) => {
            job.stop();
            console.log(`🛑 Stopped job: ${name}`);
        });

        this.jobs.clear();
        this.isRunning = false;

        console.log('✅ Notification scheduler stopped');
    }

    // Restart scheduler
    async restart() {
        this.stop();
        await this.init();
    }
}

// Create singleton instance
const notificationScheduler = new NotificationScheduler();

module.exports = notificationScheduler;