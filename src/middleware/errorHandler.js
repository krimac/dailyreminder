// Global error handler middleware
const errorHandler = (err, req, res, next) => {
    console.error('Error occurred:', err);

    // Default error
    let error = {
        success: false,
        message: 'Internal server error',
        status: 500
    };

    // Database connection errors
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        error.message = 'Database connection failed';
        error.status = 503;
    }

    // PostgreSQL errors
    if (err.code) {
        switch (err.code) {
            case '23505': // Unique violation
                error.message = 'Resource already exists';
                error.status = 409;
                break;
            case '23503': // Foreign key violation
                error.message = 'Referenced resource does not exist';
                error.status = 400;
                break;
            case '23502': // Not null violation
                error.message = 'Required field is missing';
                error.status = 400;
                break;
            case '23514': // Check violation
                error.message = 'Invalid data provided';
                error.status = 400;
                break;
            case '42P01': // Undefined table
                error.message = 'Database schema not found';
                error.status = 503;
                break;
        }
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        error.message = 'Validation failed';
        error.status = 400;
        error.details = err.details;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error.message = 'Invalid token';
        error.status = 401;
    }

    if (err.name === 'TokenExpiredError') {
        error.message = 'Token expired';
        error.status = 401;
    }

    // Send error response
    res.status(error.status).json({
        success: false,
        message: error.message,
        ...(error.details && { details: error.details }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;