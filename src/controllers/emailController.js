const emailService = require('../services/emailService');
const notificationScheduler = require('../services/notificationScheduler');
const Joi = require('joi');

// Validation schemas
const testEmailSchema = Joi.object({
    email: Joi.string().email().required()
});

const sendNotificationSchema = Joi.object({
    eventId: Joi.string().uuid().required(),
    recipientEmails: Joi.array().items(Joi.string().email()).min(1).required(),
    notificationType: Joi.string().valid('event_created', 'event_cancelled', 'event_reminder').default('event_created')
});

class EmailController {
    // Get email service status
    static async getEmailStatus(req, res) {
        try {
            const status = emailService.getStatus();
            const schedulerStats = notificationScheduler.getStats();

            res.json({
                success: true,
                message: 'Email service status retrieved successfully',
                data: {
                    emailService: status,
                    scheduler: schedulerStats
                }
            });
        } catch (err) {
            console.error('Error getting email status:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Send test email
    static async sendTestEmail(req, res) {
        try {
            const { error, value } = testEmailSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    details: error.details
                });
            }

            const { email } = value;

            if (!emailService.getStatus().configured) {
                return res.status(503).json({
                    success: false,
                    message: 'Email service not configured. Please check Gmail credentials.'
                });
            }

            const result = await emailService.sendTestEmail(email);

            res.json({
                success: true,
                message: 'Test email sent successfully',
                data: {
                    recipient: email,
                    messageId: result.messageId,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (err) {
            console.error('Error sending test email:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to send test email',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Get email statistics
    static async getEmailStats(req, res) {
        try {
            const { days = 30 } = req.query;

            const stats = await emailService.getEmailStats(parseInt(days));

            res.json({
                success: true,
                message: 'Email statistics retrieved successfully',
                data: stats
            });

        } catch (err) {
            console.error('Error getting email stats:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Get recent email history
    static async getEmailHistory(req, res) {
        try {
            const { limit = 50 } = req.query;

            const history = await emailService.getRecentEmails(parseInt(limit));

            res.json({
                success: true,
                message: 'Email history retrieved successfully',
                data: history,
                count: history.length
            });

        } catch (err) {
            console.error('Error getting email history:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Trigger immediate daily digest for user
    static async triggerDailyDigest(req, res) {
        try {
            const { email } = req.params;
            const { lookoutDays = 7 } = req.query;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email parameter is required'
                });
            }

            if (!emailService.getStatus().configured) {
                return res.status(503).json({
                    success: false,
                    message: 'Email service not configured'
                });
            }

            // This would trigger a digest for the specific user
            // For now, we'll send a manual digest
            const RecurrenceService = require('../services/recurrenceService');
            const { Event } = require('../models');

            const upcomingEvents = await RecurrenceService.getUpcomingEventsForDigest(
                parseInt(lookoutDays),
                'Europe/Berlin'
            );

            // Filter events for this user (simplified - in real implementation would check recipients)
            const userEvents = upcomingEvents.slice(0, 10); // Limit for demo

            const userSettings = {
                email: email,
                name: email.split('@')[0],
                timezone: 'Europe/Berlin'
            };

            const result = await emailService.sendDailyDigest(
                userEvents,
                email,
                userSettings,
                parseInt(lookoutDays)
            );

            res.json({
                success: true,
                message: 'Daily digest sent successfully',
                data: {
                    recipient: email,
                    eventsCount: userEvents.length,
                    lookoutDays: parseInt(lookoutDays),
                    messageId: result.messageId
                }
            });

        } catch (err) {
            console.error('Error triggering daily digest:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to send daily digest',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Trigger notification check manually
    static async triggerNotificationCheck(req, res) {
        try {
            if (!emailService.getStatus().configured) {
                return res.status(503).json({
                    success: false,
                    message: 'Email service not configured'
                });
            }

            // Trigger immediate notification check
            await notificationScheduler.checkPendingNotifications();

            res.json({
                success: true,
                message: 'Notification check triggered successfully',
                timestamp: new Date().toISOString()
            });

        } catch (err) {
            console.error('Error triggering notification check:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to trigger notification check',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Get scheduler statistics
    static async getSchedulerStats(req, res) {
        try {
            const stats = notificationScheduler.getStats();

            res.json({
                success: true,
                message: 'Scheduler statistics retrieved successfully',
                data: stats
            });

        } catch (err) {
            console.error('Error getting scheduler stats:', err);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Restart notification scheduler
    static async restartScheduler(req, res) {
        try {
            await notificationScheduler.restart();

            res.json({
                success: true,
                message: 'Notification scheduler restarted successfully',
                timestamp: new Date().toISOString()
            });

        } catch (err) {
            console.error('Error restarting scheduler:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to restart scheduler',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Send weekly digest manually
    static async sendWeeklyDigest(req, res) {
        try {
            if (!emailService.getStatus().configured) {
                return res.status(503).json({
                    success: false,
                    message: 'Email service not configured'
                });
            }

            await notificationScheduler.sendWeeklyDigests();

            res.json({
                success: true,
                message: 'Weekly digest process completed',
                timestamp: new Date().toISOString()
            });

        } catch (err) {
            console.error('Error sending weekly digest:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to send weekly digest',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Cleanup old notifications
    static async cleanupNotifications(req, res) {
        try {
            const { days = 90 } = req.query;

            const deletedCount = await notificationScheduler.cleanupOldNotifications(parseInt(days));

            res.json({
                success: true,
                message: 'Notification cleanup completed',
                data: {
                    deletedRecords: deletedCount,
                    daysKept: parseInt(days)
                }
            });

        } catch (err) {
            console.error('Error cleaning up notifications:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to cleanup notifications',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }
}

module.exports = EmailController;