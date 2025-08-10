require('dotenv').config();
const fsp = require('fs/promises');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

class CloudinaryHelper {
  // Configure Cloudinary (should be called once in your app setup)
  static configure() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure:true,
    });
  }

  // Upload to Cloudinary (from your working code, included for completeness)
  static async uploadToCloudinary(file, folderPath) {
    return new Promise((resolve, reject) => {
    //   const { Readable } = require('stream');
      const stream = Readable.from(file.buffer);

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

      stream.pipe(uploadStream);
    });
  }

  // Delete a single image by public_id
  static async deleteFromCloudinary(publicId) {
    try {
        // console.log(publicId)
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  // Delete multiple images by public_ids
  static async deleteMultipleFromCloudinary(publicIds) {//expects publicIds to be an array
    try {
      const result = await cloudinary.api.delete_resources(publicIds, {
        resource_type: 'image',
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to delete multiple images: ${error.message}`);
    }
  }


  // Check if a single image exists by public_id
static async checkFileExists(publicId) {
  try {
    const result = await cloudinary.api.resource(publicId, { resource_type: 'image' });
    return !!result; // Returns true if the resource exists
  } catch (error) {
    if (error.http_code === 404) {
      return false; // Image does not exist
    }
    // Log the error or handle it in some way, but return false
    // console.error(`Error checking file existence: ${error.message}`);
    return false;
  }
}

 // Check if multiple images exist by public_ids
  static async checkMultipleFilesExist(publicIds) {
  try {
    const results = await Promise.allSettled(
      publicIds.map(async (publicId) => {
        try {
          const exists = await CloudinaryHelper.checkFileExists(publicId);
          return { public_id: publicId, exists };
        } catch (error) {
          return { public_id: publicId, exists: false, error: error.message };
        }
      })
    );

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return { public_id: publicIds[results.indexOf(result)], exists: false, error: result.reason.message };
      }
    });
  } catch (error) {
    // This catch block is unlikely to be hit, but it's here for completeness
    throw new Error(`Error checking multiple files: ${error.message}`);
  }
}


  // Retrieve a single image by public_id
  static async getImage(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: 'image',
      });
      return {
        public_id: result.public_id,
        url: result.secure_url,
        format: result.format,
        created_at: result.created_at,
      };
    } catch (error) {
      throw new Error(`Failed to retrieve image: ${error.message}`);
    }
  }

  // Retrieve multiple images by public_ids
  static async getMultipleImages(publicIds) {
    try {
      const results = await Promise.all(
        publicIds.map(async (publicId) => {
          try {
            return await CloudinaryHelper.getImage(publicId);
          } catch (error) {
            return { public_id: publicId, error: error.message };
          }
        })
      );
      return results;
    } catch (error) {
      throw new Error(`Failed to retrieve multiple images: ${error.message}`);
    }
  }
}

module.exports = CloudinaryHelper 