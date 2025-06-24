const multer = require('multer');
const { CustomError } = require('../libraries/custom_error');
const logger = require('../config/logger');

const handleError = (error, req, res, next) => {
  // Handle Multer errors
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    switch (error.code) {
      case 'MISSING_FIELD_NAME':
        message = 'Missing or Invalid file fieldname';
        break;
      case 'LIMIT_FILE_SIZE':
        message = 'A single file size must not exceeds 5MB';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = `File upload limit exceeded or invalid file fieldname`;
        break;
      default:
        message = error.message;
    }

    const wrappedError = new CustomError({
      name: 'MulterFileError',
      message,
      statusCode: 400,
      details: {
        code: error.code,
        field: error.field,
      },
      log_error: false,
    });

    return handleError(wrappedError, req, res, next); // reuse the same handler recursively
  }

  // Handle your CustomError
  if (error instanceof CustomError) {
    if (error.log_error) {
      logger.error({
        message: error.message,
        statusCode: error.statusCode || 400,
         // user: req.user ?? {}, // Uncomment when auth is implemented
        user: {
          name: `${req?.user?.firstname} ${req?.user?.lastname}` ?? {},
        },
        url: req.url,
        method: req.method,
      });
    }

    return res.status(error.statusCode||400).json({
      success: false,
      error: {
        message: error.message,
        details: error.details,
      },
    });
  }

  // Unknown error fallback
  logger.error({
    message: error.message,
    stack: error.stack,
     // user: req.user ?? {}, // Uncomment when auth is implemented
    user: {
      name: `${req?.user?.firstname} ${req?.user?.lastname}` ?? {},
    },
    url: req.url,
    method: req.method,
  });

  return res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error occurred',
      details: {},
    },
  });
};

module.exports = handleError;



// const {CustomError} = require('../libraries/custom_error');
// const logger = require('../config/logger');

// const handleError = (error, req, res, next)=>{
//         if (error instanceof CustomError) {
//           if (error.log_error) {
//             logger.error({
//               message: error.message,
//               statusCode: error.statusCode,
//               // user: req.user ?? {}, // Uncomment when auth is implemented
//               user: {
//                 name: `${req?.user?.firstname} ${req?.user?.lastname}` ?? {},
//               },
//               url: req.url,
//               method: req.method,
//             });
//           }
//           res.status(error.statusCode).json({
//             success: false,
//             error: {
//               message: error.message,
//               details: error.details,
//             },
//           });
//         } else {
//           logger.error({
//             message: error.message,
//             stack: error.stack,
//             // user: req.user ?? {}, // Uncomment when auth is implemented
//              user: {
//                 name: `${req?.user?.firstname} ${req?.user?.lastname}` ?? {},
//               },
//             url: req.url,
//             method: req.method,
//           });
//           res.status(500).json({
//             success: false,
//             error: {
//               message: 'Internal server error occurred',
//               details: {},
//             },
//           });
//         }
//     }

// module.exports = handleError