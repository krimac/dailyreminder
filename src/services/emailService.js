const emailConfig = require('../config/email');
const EmailTemplates = require('../templates/emailTemplates');
const { pool } = require('../config/database');
const socketService = require('./socketService');

class EmailService {
    constructor() {
        this.retryDelays = [1000, 5000, 15000, 60000]; // 1s, 5s, 15s, 1min
        this.maxRetries = this.retryDelays.length;
    }

    // Initialize email service
    async init() {
        try {
            const isConfigured = await emailConfig.init();
            if (isConfigured) {
                console.log('✅ Email service initialized successfully');
                return true;
            } else {
                console.log('⚠️  Email service not configured - notifications disabled');
                return false;
            }
        } catch (error) {
            console.error('❌ Email service initialization failed:', error.message);
            return false;
        }
    }

    // Send email with retry logic
    async sendEmail(mailOptions, retryCount = 0) {
        if (!emailConfig.isReady()) {
            throw new Error('Email service not configured. Please set Gmail credentials.');
        }

        try {
            const transporter = emailConfig.getTransporter();

            // Add default from address if not specified
            if (!mailOptions.from) {
                mailOptions.from = {
                    name: process.env.NOTIFICATION_FROM_NAME || 'Daily Reminder System',
                    address: process.env.NOTIFICATION_FROM_EMAIL || process.env.GMAIL_USER
                };
            }

            console.log(`📧 Sending email to ${mailOptions.to} (attempt ${retryCount + 1})`);

            const info = await transporter.sendMail(mailOptions);

            console.log('✅ Email sent successfully');
            console.log('📧 Message ID:', info.messageId);

            return {
                success: true,
                messageId: info.messageId,
                attempts: retryCount + 1
            };

        } catch (error) {
            console.error(`❌ Email sending failed (attempt ${retryCount + 1}):`, error.message);

            // Retry logic
            if (retryCount < this.maxRetries - 1) {
                const delay = this.retryDelays[retryCount];
                console.log(`🔄 Retrying in ${delay}ms...`);

                await new Promise(resolve => setTimeout(resolve, delay));
                return this.sendEmail(mailOptions, retryCount + 1);
            } else {
                console.error(`💀 Email sending failed after ${this.maxRetries} attempts`);
                throw error;
            }
        }
    }

    // Log email to notification history
    async logNotification(eventId, recipientEmail, notificationType, status, messageId = null, errorMessage = null) {
        try {
            const query = `
                INSERT INTO notification_history (event_id, recipient_email, notification_type, status, error_message)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, sent_at
            `;

            const values = [eventId, recipientEmail, notificationType, status, errorMessage];
            const result = await pool.query(query, values);

            console.log(`📝 Logged notification: ${notificationType} to ${recipientEmail} - ${status}`);
            return result.rows[0];

        } catch (error) {
            console.error('❌ Failed to log notification:', error.message);
            // Don't throw here - logging failure shouldn't stop email sending
        }
    }

    // Send event reminder
    async sendEventReminder(event, recipient, leadTime, timezone = 'Europe/Berlin') {
        try {
            const template = EmailTemplates.eventReminder(event, recipient, leadTime, timezone);

            const mailOptions = {
                to: recipient.email,
                subject: template.subject,
                html: template.html,
                text: template.text
            };

            const result = await this.sendEmail(mailOptions);

            // Log successful notification
            await this.logNotification(
                event.id,
                recipient.email,
                'event_reminder',
                'sent',
                result.messageId
            );

            // Send real-time notification if user is connected
            if (socketService.isUserConnected(recipient.email)) {
                socketService.sendNotificationToUsers([recipient.email], {
                    title: 'Email Sent',
                    message: `Reminder sent for "${event.title}"`,
                    type: 'email_sent',
                    eventId: event.id
                });
            }

            return result;

        } catch (error) {
            // Log failed notification
            await this.logNotification(
                event.id,
                recipient.email,
                'event_reminder',
                'failed',
                null,
                error.message
            );

            throw error;
        }
    }

    // Send daily digest
    async sendDailyDigest(events, userEmail, userSettings, lookoutDays = 7) {
        try {
            const timezone = userSettings.timezone || 'Europe/Berlin';
            const template = EmailTemplates.dailyDigest(events, userSettings, lookoutDays, timezone);

            const mailOptions = {
                to: userEmail,
                subject: template.subject,
                html: template.html,
                text: template.text
            };

            const result = await this.sendEmail(mailOptions);

            // Log successful digest
            await this.logNotification(
                null, // No specific event for digest
                userEmail,
                'digest',
                'sent',
                result.messageId
            );

            // Send real-time notification if user is connected
            if (socketService.isUserConnected(userEmail)) {
                socketService.sendNotificationToUsers([userEmail], {
                    title: 'Daily Digest Sent',
                    message: `Digest with ${events.length} event${events.length === 1 ? '' : 's'} delivered`,
                    type: 'digest_sent',
                    eventsCount: events.length
                });
            }

            return result;

        } catch (error) {
            // Log failed digest
            await this.logNotification(
                null,
                userEmail,
                'digest',
                'failed',
                null,
                error.message
            );

            throw error;
        }
    }

    // Send event created notification
    async sendEventCreatedNotification(event, recipient, timezone = 'Europe/Berlin') {
        try {
            const template = EmailTemplates.eventCreated(event, recipient, timezone);

            const mailOptions = {
                to: recipient.email,
                subject: template.subject,
                html: template.html,
                text: template.text
            };

            const result = await this.sendEmail(mailOptions);

            // Log successful notification
            await this.logNotification(
                event.id,
                recipient.email,
                'event_created',
                'sent',
                result.messageId
            );

            return result;

        } catch (error) {
            // Log failed notification
            await this.logNotification(
                event.id,
                recipient.email,
                'event_created',
                'failed',
                null,
                error.message
            );

            throw error;
        }
    }

    // Send event cancelled notification
    async sendEventCancelledNotification(eventId, eventTitle, eventDate, recipient, timezone = 'Europe/Berlin') {
        try {
            const template = EmailTemplates.eventCancelled(eventTitle, eventDate, recipient, timezone);

            const mailOptions = {
                to: recipient.email,
                subject: template.subject,
                html: template.html,
                text: template.text
            };

            const result = await this.sendEmail(mailOptions);

            // Log successful notification
            await this.logNotification(
                eventId,
                recipient.email,
                'event_cancelled',
                'sent',
                result.messageId
            );

            return result;

        } catch (error) {
            // Log failed notification
            await this.logNotification(
                eventId,
                recipient.email,
                'event_cancelled',
                'failed',
                null,
                error.message
            );

            throw error;
        }
    }

    // Send test email
    async sendTestEmail(toEmail) {
        try {
            if (!emailConfig.isReady()) {
                throw new Error('Email service not configured');
            }

            const result = await emailConfig.sendTestEmail(toEmail);

            // Log test email
            await this.logNotification(
                null,
                toEmail,
                'test_email',
                'sent',
                result.messageId
            );

            return result;

        } catch (error) {
            // Log failed test
            await this.logNotification(
                null,
                toEmail,
                'test_email',
                'failed',
                null,
                error.message
            );

            throw error;
        }
    }

    // Get email statistics
    async getEmailStats(days = 30) {
        try {
            const query = `
                SELECT
                    notification_type,
                    status,
                    COUNT(*) as count,
                    DATE(sent_at) as date
                FROM notification_history
                WHERE sent_at >= NOW() - INTERVAL '${days} days'
                GROUP BY notification_type, status, DATE(sent_at)
                ORDER BY date DESC, notification_type
            `;

            const result = await pool.query(query);

            // Aggregate statistics
            const stats = {
                totalEmails: 0,
                successfulEmails: 0,
                failedEmails: 0,
                byType: {},
                recentDays: []
            };

            result.rows.forEach(row => {
                stats.totalEmails += parseInt(row.count);

                if (row.status === 'sent') {
                    stats.successfulEmails += parseInt(row.count);
                } else if (row.status === 'failed') {
                    stats.failedEmails += parseInt(row.count);
                }

                if (!stats.byType[row.notification_type]) {
                    stats.byType[row.notification_type] = { sent: 0, failed: 0 };
                }
                stats.byType[row.notification_type][row.status] += parseInt(row.count);
            });

            stats.successRate = stats.totalEmails > 0 ?
                ((stats.successfulEmails / stats.totalEmails) * 100).toFixed(2) : 0;

            return stats;

        } catch (error) {
            console.error('❌ Failed to get email stats:', error.message);
            throw error;
        }
    }

    // Get recent email history
    async getRecentEmails(limit = 50) {
        try {
            const query = `
                SELECT
                    nh.*,
                    e.title as event_title
                FROM notification_history nh
                LEFT JOIN events e ON nh.event_id = e.id
                ORDER BY nh.sent_at DESC
                LIMIT $1
            `;

            const result = await pool.query(query, [limit]);
            return result.rows;

        } catch (error) {
            console.error('❌ Failed to get email history:', error.message);
            throw error;
        }
    }

    // Check service status
    getStatus() {
        const config = emailConfig.getConfig();
        return {
            configured: emailConfig.isReady(),
            config: config,
            retrySettings: {
                maxRetries: this.maxRetries,
                retryDelays: this.retryDelays
            }
        };
    }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;