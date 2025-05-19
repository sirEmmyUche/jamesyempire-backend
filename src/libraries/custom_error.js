class CustomError extends Error {
    constructor(data) {
      super();
      this.name = data.constructor.name; //a good practise for automatic naming
      this.message = data.message; // the error message
      this.statusCode = data.statusCode; // http status code
      this.details = data.details ? data.details : {}; //optional
      this.log_error = data.log_error ? data.log_error : false; //optional
      this.user = data.user ?? {}; //optional // Uncomment when auth is implemented
    }
  }
  
  module.exports = { CustomError };
