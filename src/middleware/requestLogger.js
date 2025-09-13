// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    console.log(`📝 ${timestamp} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);

    // Log request body for non-GET requests (but hide sensitive data)
    if (req.method !== 'GET' && req.body) {
        const sanitizedBody = { ...req.body };

        // Hide sensitive fields
        if (sanitizedBody.password) sanitizedBody.password = '[HIDDEN]';
        if (sanitizedBody.token) sanitizedBody.token = '[HIDDEN]';

        console.log(`📄 Request body:`, JSON.stringify(sanitizedBody, null, 2));
    }

    // Log response time when request completes
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - start;
        console.log(`⏱️  ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);

        // Log error responses
        if (res.statusCode >= 400) {
            console.log(`❌ Error response:`, data);
        }

        originalSend.call(this, data);
    };

    next();
};

module.exports = requestLogger;