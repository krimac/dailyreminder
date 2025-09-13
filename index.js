const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { testConnection, initializeDatabase } = require('./src/config/database');
const socketService = require('./src/services/socketService');

// Middleware
const errorHandler = require('./src/middleware/errorHandler');
const requestLogger = require('./src/middleware/requestLogger');

// Routes
const eventRoutes = require('./src/routes/eventRoutes');
const recipientRoutes = require('./src/routes/recipientRoutes');
const userSettingsRoutes = require('./src/routes/userSettingsRoutes');
const socketRoutes = require('./src/routes/socketRoutes');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
if (process.env.NODE_ENV !== 'test') {
    app.use(requestLogger);
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Daily Reminder API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        websocket: {
            enabled: true,
            connectedClients: socketService.getConnectedClientsCount()
        }
    });
});

// API routes
app.use('/api/events', eventRoutes);
app.use('/api/recipients', recipientRoutes);
app.use('/api/settings', userSettingsRoutes);
app.use('/api/socket', socketRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to Daily Reminder API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            events: '/api/events',
            recipients: '/api/recipients',
            settings: '/api/settings',
            websocket: '/api/socket'
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
    try {
        console.log('🚀 Starting Daily Reminder API...');

        // Test database connection
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('❌ Failed to connect to database. Exiting...');
            process.exit(1);
        }

        // Initialize database schema
        await initializeDatabase();

        // Initialize Socket.IO
        socketService.init(server);

        // Start the server
        server.listen(PORT, () => {
            console.log(`✅ Daily Reminder API is running on port ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            console.log(`📚 API endpoints: http://localhost:${PORT}/`);
            console.log(`🔌 WebSocket server ready for real-time connections`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

// Start the application
if (require.main === module) {
    startServer();
}

module.exports = app;