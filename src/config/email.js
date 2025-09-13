const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

class EmailConfig {
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
    }

    // Initialize Gmail SMTP transporter
    async init() {
        try {
            console.log('📧 Initializing Gmail SMTP configuration...');

            // Validate required environment variables
            const requiredVars = ['GMAIL_USER', 'GMAIL_APP_PASSWORD'];
            const missing = requiredVars.filter(varName => !process.env[varName]);

            if (missing.length > 0) {
                console.warn('⚠️  Missing Gmail configuration:', missing.join(', '));
                console.warn('📝 Email functionality will be disabled until configured');
                return false;
            }

            // Create Gmail transporter
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                host: 'smtp.gmail.com',
                port: 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_APP_PASSWORD
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            // Test the connection
            await this.testConnection();

            this.isConfigured = true;
            console.log('✅ Gmail SMTP configuration successful');
            return true;

        } catch (error) {
            console.error('❌ Gmail SMTP configuration failed:', error.message);
            this.isConfigured = false;
            return false;
        }
    }

    // Test SMTP connection
    async testConnection() {
        if (!this.transporter) {
            throw new Error('Transporter not initialized');
        }

        try {
            console.log('🔍 Testing Gmail SMTP connection...');
            await this.transporter.verify();
            console.log('✅ Gmail SMTP connection verified');
            return true;
        } catch (error) {
            console.error('❌ Gmail SMTP connection test failed:', error.message);
            throw error;
        }
    }

    // Get transporter instance
    getTransporter() {
        if (!this.isConfigured || !this.transporter) {
            throw new Error('Gmail SMTP not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
        }
        return this.transporter;
    }

    // Check if email is configured
    isReady() {
        return this.isConfigured && this.transporter !== null;
    }

    // Get email configuration info
    getConfig() {
        return {
            configured: this.isConfigured,
            user: process.env.GMAIL_USER || 'Not configured',
            fromEmail: process.env.NOTIFICATION_FROM_EMAIL || process.env.GMAIL_USER || 'Not configured',
            fromName: process.env.NOTIFICATION_FROM_NAME || 'Daily Reminder System',
            service: 'Gmail SMTP'
        };
    }

    // Send test email
    async sendTestEmail(toEmail) {
        if (!this.isReady()) {
            throw new Error('Email service not configured');
        }

        const testMailOptions = {
            from: {
                name: process.env.NOTIFICATION_FROM_NAME || 'Daily Reminder System',
                address: process.env.NOTIFICATION_FROM_EMAIL || process.env.GMAIL_USER
            },
            to: toEmail,
            subject: 'Daily Reminder System - Test Email',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
                        📧 Test Email Successful!
                    </h2>
                    <p>Hello!</p>
                    <p>This is a test email from your Daily Reminder System to confirm that Gmail SMTP is working correctly.</p>

                    <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px;">
                        <h3 style="margin-top: 0; color: #4CAF50;">✅ Configuration Status</h3>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li>Gmail SMTP: Connected</li>
                            <li>Email Service: Active</li>
                            <li>Notifications: Ready</li>
                        </ul>
                    </div>

                    <p>Your Daily Reminder System is now ready to send event notifications and digest emails!</p>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #666; font-size: 12px; text-align: center;">
                        Daily Reminder System - Test Email<br>
                        Sent at: ${new Date().toLocaleString('en-US', {
                            timeZone: 'Europe/Berlin',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZoneName: 'short'
                        })}
                    </p>
                </div>
            `,
            text: `
Daily Reminder System - Test Email

Hello!

This is a test email from your Daily Reminder System to confirm that Gmail SMTP is working correctly.

Configuration Status:
✅ Gmail SMTP: Connected
✅ Email Service: Active
✅ Notifications: Ready

Your Daily Reminder System is now ready to send event notifications and digest emails!

Daily Reminder System - Test Email
Sent at: ${new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' })}
            `
        };

        try {
            const info = await this.transporter.sendMail(testMailOptions);
            console.log('✅ Test email sent successfully');
            console.log('📧 Message ID:', info.messageId);
            return {
                success: true,
                messageId: info.messageId,
                recipient: toEmail
            };
        } catch (error) {
            console.error('❌ Test email failed:', error.message);
            throw error;
        }
    }

    // Close transporter connection
    async close() {
        if (this.transporter) {
            this.transporter.close();
            this.transporter = null;
            this.isConfigured = false;
            console.log('📧 Gmail SMTP connection closed');
        }
    }
}

// Create singleton instance
const emailConfig = new EmailConfig();

module.exports = emailConfig;