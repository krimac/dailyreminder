const express = require('express');
const socketService = require('../services/socketService');

const router = express.Router();

// Get WebSocket connection statistics
router.get('/stats', (req, res) => {
    try {
        const stats = {
            connectedClients: socketService.getConnectedClientsCount(),
            clients: socketService.getConnectedClients(),
            timestamp: new Date().toISOString()
        };

        res.json({
            success: true,
            message: 'WebSocket statistics retrieved successfully',
            data: stats
        });
    } catch (err) {
        console.error('Error getting WebSocket stats:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Check if a specific user is connected
router.get('/user/:email/status', (req, res) => {
    try {
        const { email } = req.params;
        const isConnected = socketService.isUserConnected(email);

        res.json({
            success: true,
            message: 'User connection status retrieved successfully',
            data: {
                email,
                isConnected,
                timestamp: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error('Error checking user connection status:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Send system-wide broadcast message
router.post('/broadcast', (req, res) => {
    try {
        const { message, type = 'info' } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        socketService.broadcastSystemMessage(message, type);

        res.json({
            success: true,
            message: 'System message broadcasted successfully',
            data: {
                message,
                type,
                timestamp: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error('Error broadcasting system message:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Send notification to specific users
router.post('/notify', (req, res) => {
    try {
        const { userEmails, notification } = req.body;

        if (!userEmails || !Array.isArray(userEmails) || userEmails.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'userEmails array is required'
            });
        }

        if (!notification || !notification.title || !notification.message) {
            return res.status(400).json({
                success: false,
                message: 'Notification must include title and message'
            });
        }

        socketService.sendNotificationToUsers(userEmails, notification);

        res.json({
            success: true,
            message: 'Notification sent successfully',
            data: {
                recipients: userEmails,
                notification,
                timestamp: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error('Error sending notification:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Send digest preview to user
router.post('/digest-preview', (req, res) => {
    try {
        const { userEmail, events, lookoutDays } = req.body;

        if (!userEmail) {
            return res.status(400).json({
                success: false,
                message: 'userEmail is required'
            });
        }

        if (!events || !Array.isArray(events)) {
            return res.status(400).json({
                success: false,
                message: 'events array is required'
            });
        }

        socketService.sendDigestPreview(userEmail, events, lookoutDays || 7);

        res.json({
            success: true,
            message: 'Digest preview sent successfully',
            data: {
                userEmail,
                eventsCount: events.length,
                lookoutDays: lookoutDays || 7,
                timestamp: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error('Error sending digest preview:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Broadcast connection statistics update
router.post('/broadcast-stats', (req, res) => {
    try {
        socketService.broadcastConnectionStats();

        res.json({
            success: true,
            message: 'Connection statistics broadcasted successfully',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error broadcasting connection stats:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

module.exports = router;