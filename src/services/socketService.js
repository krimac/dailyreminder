const { Server } = require('socket.io');

class SocketService {
    constructor() {
        this.io = null;
        this.connectedClients = new Map();
    }

    // Initialize Socket.IO server
    init(httpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });

        this.setupEventHandlers();
        console.log('🔌 Socket.IO server initialized');
        return this.io;
    }

    // Set up Socket.IO event handlers
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`👤 Client connected: ${socket.id}`);

            // Store client connection with user info
            socket.on('authenticate', (userData) => {
                this.connectedClients.set(socket.id, {
                    socketId: socket.id,
                    email: userData.email,
                    timezone: userData.timezone || 'Europe/Berlin',
                    connectedAt: new Date()
                });

                console.log(`✅ Client authenticated: ${userData.email} (${socket.id})`);
                socket.emit('authenticated', { success: true });
            });

            // Handle client joining specific rooms (for targeted notifications)
            socket.on('join-room', (roomName) => {
                socket.join(roomName);
                console.log(`🏠 Client ${socket.id} joined room: ${roomName}`);
            });

            // Handle client leaving rooms
            socket.on('leave-room', (roomName) => {
                socket.leave(roomName);
                console.log(`🚪 Client ${socket.id} left room: ${roomName}`);
            });

            // Handle disconnection
            socket.on('disconnect', (reason) => {
                const clientInfo = this.connectedClients.get(socket.id);
                console.log(`👋 Client disconnected: ${socket.id} (${clientInfo?.email || 'unknown'}) - Reason: ${reason}`);
                this.connectedClients.delete(socket.id);
            });

            // Handle ping/pong for connection health
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: Date.now() });
            });
        });
    }

    // Broadcast event creation to all clients
    broadcastEventCreated(event) {
        if (!this.io) return;

        console.log(`📢 Broadcasting event created: ${event.title} (${event.id})`);
        this.io.emit('event:created', {
            type: 'event_created',
            event: event.toJSON ? event.toJSON() : event,
            timestamp: new Date().toISOString()
        });
    }

    // Broadcast event updates to all clients
    broadcastEventUpdated(event) {
        if (!this.io) return;

        console.log(`📢 Broadcasting event updated: ${event.title} (${event.id})`);
        this.io.emit('event:updated', {
            type: 'event_updated',
            event: event.toJSON ? event.toJSON() : event,
            timestamp: new Date().toISOString()
        });
    }

    // Broadcast event deletion to all clients
    broadcastEventDeleted(eventId, eventTitle) {
        if (!this.io) return;

        console.log(`📢 Broadcasting event deleted: ${eventTitle} (${eventId})`);
        this.io.emit('event:deleted', {
            type: 'event_deleted',
            eventId,
            eventTitle,
            timestamp: new Date().toISOString()
        });
    }

    // Broadcast recipient changes
    broadcastRecipientUpdated(recipient) {
        if (!this.io) return;

        console.log(`📢 Broadcasting recipient updated: ${recipient.email} (${recipient.id})`);
        this.io.emit('recipient:updated', {
            type: 'recipient_updated',
            recipient: recipient.toJSON ? recipient.toJSON() : recipient,
            timestamp: new Date().toISOString()
        });
    }

    // Send targeted notification to specific users
    sendNotificationToUsers(userEmails, notification) {
        if (!this.io || !Array.isArray(userEmails)) return;

        const targetSockets = [];
        this.connectedClients.forEach((client, socketId) => {
            if (userEmails.includes(client.email)) {
                targetSockets.push(socketId);
            }
        });

        if (targetSockets.length > 0) {
            console.log(`🎯 Sending notification to ${targetSockets.length} clients`);
            targetSockets.forEach(socketId => {
                this.io.to(socketId).emit('notification', {
                    type: 'user_notification',
                    ...notification,
                    timestamp: new Date().toISOString()
                });
            });
        }
    }

    // Send system-wide announcement
    broadcastSystemMessage(message, type = 'info') {
        if (!this.io) return;

        console.log(`📢 Broadcasting system message: ${message}`);
        this.io.emit('system:message', {
            type: 'system_message',
            level: type,
            message,
            timestamp: new Date().toISOString()
        });
    }

    // Send upcoming events digest preview to specific users
    sendDigestPreview(userEmail, events, lookoutDays) {
        if (!this.io) return;

        const targetSockets = [];
        this.connectedClients.forEach((client, socketId) => {
            if (client.email === userEmail) {
                targetSockets.push(socketId);
            }
        });

        if (targetSockets.length > 0) {
            console.log(`📊 Sending digest preview to ${userEmail}`);
            targetSockets.forEach(socketId => {
                this.io.to(socketId).emit('digest:preview', {
                    type: 'digest_preview',
                    events,
                    lookoutDays,
                    userEmail,
                    timestamp: new Date().toISOString()
                });
            });
        }
    }

    // Get connected clients count
    getConnectedClientsCount() {
        return this.connectedClients.size;
    }

    // Get connected clients info
    getConnectedClients() {
        return Array.from(this.connectedClients.values());
    }

    // Check if specific user is connected
    isUserConnected(email) {
        return Array.from(this.connectedClients.values()).some(client => client.email === email);
    }

    // Send connection statistics
    broadcastConnectionStats() {
        if (!this.io) return;

        const stats = {
            connectedClients: this.getConnectedClientsCount(),
            timestamp: new Date().toISOString()
        };

        this.io.emit('system:stats', stats);
    }
}

// Create singleton instance
const socketService = new SocketService();

module.exports = socketService;