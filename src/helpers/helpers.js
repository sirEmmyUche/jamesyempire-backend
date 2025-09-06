require('dotenv').config();
const fsp = require('fs/promises');
const path = require('path');
const nodemailer = require("nodemailer");
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

const nodemailerTransporter = nodemailer.createTransport({
    host: 'mail.privateemail.com',
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
      user: `${process.env.OFFICIAL_MAIL}`,
      pass: `${process.env.OFFICIAL_MAIL_PASSWORD}` 
    },
    tls: {
        rejectUnauthorized: false, // Ignore SSL certificate validation
    },
  }); 

cloudinary.config({
  cloud_name:`${process.env.CLOUDINARY_CLOUD_NAME}`,
  api_key:`${process.env.CLOUDINARY_API_KEY}`,
  api_secret:`${process.env.CLOUDINARY_API_SECRETE}`,
  secure:true
})

class Helpers {
  
   static async sendEmailNotficationForChatRequest(recipientMail, recipientName,){
    try{
       const mailOption = {
      from:`${process.env.OFFICIAL_MAIL}`,
      to: recipientMail,
      subject:`Chat Request`,
      html:`<h3>Hello ${recipientName},</h3> 
      <p>A client wants to chat with you concerning a property you posted at jamseyempire.</p>
      <p>Regards</p> `,
  }
    const result = await nodemailerTransporter.sendMail(mailOption);
    return result
    }catch(error){
      console.error('error sending email notif for chat request:', error)
      return false
    }
  }

  // send email notif for new ads response
  static async sendEmailNotficationForNewAdsResponse(recipientMail, recipientName){
    try{
       const mailOption = {
      from:`${process.env.OFFICIAL_MAIL}`,
      to: recipientMail,
      subject:`New Ads Response`,
      html:`<h3>Hello ${recipientName},</h3> 
      <p>A client has responded to your ads on jamseyempire.</p>
      <p>Regards</p> `,
  }
    const result = await nodemailerTransporter.sendMail(mailOption);
    return result
    }catch(error){
      console.error('error sending email notif for chat request:', error)
      return false
    }
  }

    /**
 * Filters and validates update fields against existing DB fields.
 * @param {Object} existingData - The data object fetched from DB.
 * @param {Object} inputData - The incoming update payload (from req.body).
 * @param {Object} options - Extra options (like parseJSON for JSON strings).
 * @returns {Object} - { validUpdates, invalid_fields }
 */


static filterValidUpdates(existingData, inputData, options = {}) {
  const validUpdates = {};
  const invalid_fields = [];

  const existingKeys = Object.keys(existingData);

  for (const key of Object.keys(inputData)) {
    // console.log(key)
    if (existingKeys.includes(key)) {
      if (key === "property_features" && options.parseJSON) {
        try {
          let rawValue = inputData[key];
          // console.log("Received property_features:", rawValue); // Debug log

          // Handle case where property_features is an array
          if (Array.isArray(rawValue)) {
            // Find the first valid JSON string
            rawValue = rawValue.find((val) => typeof val === "string" && val.startsWith("{")) || rawValue[0];
          }

          const parsed = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
          // console.log("Parsed property_features:", parsed); // Debug log
          if (typeof parsed !== "object" || parsed === null) {
            throw new Error("property_features must be a valid JSON object");
          }
          validUpdates[key] = {
            ...existingData[key],
            ...parsed,
          };
        } catch (e) {
          // console.error("Error parsing property_features:", e.message, "Raw value:", inputData[key]);
          invalid_fields.push({ name: key, message: `Invalid JSON format: ${e.message}` });
        }
      } else {
        validUpdates[key] = inputData[key];
      }
    } 
    else {
      invalid_fields.push({ name: key, message: "Field not allowed" });
    }
  }

  return { validUpdates, invalid_fields};
}


static async cleanupUploadedFiles(filenames = [], folderPath) {
  await Promise.all(
    filenames.map(async (filename) => {
      const filePath = path.join(folderPath, filename);
      try {
        await fsp.unlink(filePath);
      } catch (err) {
        console.warn(`Could not delete file ${filePath}:`, err.message);
      }
    })
  );
}

/**
   * Upload a single or multiple files to Cloudinary
   * @param {string[]} filePaths - Local file paths
   * @param {string} folderPath - Cloudinary folder path
   * @returns {Promise<Object[]>} Uploaded file metadata
   */
    static async uploadToCloudinary(file, folderPath) {
  return new Promise((resolve, reject) => {
    // Create a readable stream from the file buffer
    const stream = Readable.from(file.buffer);

    // Upload to Cloudinary using upload_stream
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderPath,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        }
        resolve(result);
      }
    );

    // Pipe the buffer stream to Cloudinary
    stream.pipe(uploadStream);
  });
}

 

}

module.exports = Helpers