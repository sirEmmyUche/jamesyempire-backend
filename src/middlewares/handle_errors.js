const {CustomError} = require('../libraries/custom_error');
const logger = require('../config/logger');

const handleError = (error, req, res, next)=>{
        if (error instanceof CustomError) {
          if (error.log_error) {
            logger.error({
              message: error.message,
              statusCode: error.statusCode,
              user: req.user ?? {}, // Uncomment when auth is implemented
              url: req.url,
              method: req.method,
            });
          }
          res.status(error.statusCode).json({
            success: false,
            error: {
              message: error.message,
              details: error.details,
            },
          });
        } else {
          logger.error({
            message: error.message,
            stack: error.stack,
            user: req.user ?? {}, // Uncomment when auth is implemented
            url: req.url,
            method: req.method,
          });
          res.status(500).json({
            success: false,
            error: {
              message: 'Internal server error occurred',
              details: {},
            },
          });
        }
    }

module.exports = handleError