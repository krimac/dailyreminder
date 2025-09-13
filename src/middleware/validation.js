const Joi = require('joi');

// Middleware to validate UUIDs in route parameters
const validateUUID = (paramName = 'id') => {
    return (req, res, next) => {
        const uuid = req.params[paramName];

        // UUID v4 regex
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(uuid)) {
            return res.status(400).json({
                success: false,
                message: `Invalid ${paramName} format. Must be a valid UUID.`
            });
        }

        next();
    };
};

// Middleware to validate email in route parameters
const validateEmail = (paramName = 'email') => {
    return (req, res, next) => {
        const email = req.params[paramName];

        const emailSchema = Joi.string().email();
        const { error } = emailSchema.validate(email);

        if (error) {
            return res.status(400).json({
                success: false,
                message: `Invalid ${paramName} format. Must be a valid email address.`
            });
        }

        next();
    };
};

// Generic validation middleware for request body
const validateBody = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }

        // Replace request body with validated and sanitized data
        req.body = value;
        next();
    };
};

// Generic validation middleware for query parameters
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, { abortEarly: false });

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Query validation failed',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }

        // Replace query with validated data
        req.query = value;
        next();
    };
};

// Validate pagination parameters
const validatePagination = (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({
            success: false,
            message: 'Page must be a positive integer'
        });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
            success: false,
            message: 'Limit must be a positive integer between 1 and 100'
        });
    }

    req.pagination = {
        page: pageNum,
        limit: limitNum,
        offset: (pageNum - 1) * limitNum
    };

    next();
};

module.exports = {
    validateUUID,
    validateEmail,
    validateBody,
    validateQuery,
    validatePagination
};