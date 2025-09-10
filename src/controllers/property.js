require('dotenv').config();
const {CustomError} = require('../libraries/custom_error');
const { v4: uuidv4 } = require('uuid'); 
const Utilities = require('../utils/utilities');
const fsp = require('fs/promises');
const fs = require('fs')
const DB_Property_Model = require('../models/property')
const Helpers = require('../helpers/helpers')
const CloudinaryHelper = require('../helpers/cloudinary')
const path = require('path');
const validator = require('validator');
// const DB_Account_Model = require('../models/account');

class Property{
    static async propertyAdsResponse(req,res,next){
      try{
        const invalid_inputs = [];
        const {name, phone, email, message, location} = req.body;
        const ads_response_id = uuidv4();

        // Basic presence checks
        if (!name) invalid_inputs.push('name');
        if (!phone) invalid_inputs.push('phone');
        if (!email) invalid_inputs.push('email');
        if (!message) invalid_inputs.push('message');
        if (!location) invalid_inputs.push('location');

        if(invalid_inputs.length > 0){
          throw new CustomError({
            message: 'All fields are required',
            statusCode: 400,
            details: { invalid_inputs }
          });
        }

        if (!validator.isEmail(email)) {
             throw new CustomError({
            message: 'Invalid email address',
            statusCode: 400,
            details: {}
          });
        }

        if(!Utilities.validatePhoneNumber(phone)){
           throw new CustomError({
            message: 'Invalid phone number',
            statusCode: 400,
            details: {}
          });
        }

        const validationRules = {
          message: { min: 1, max:500},
          name: { min: 2, max: 150 },
          // phone: { min: 10, max: 15 },
          email: { min: 5, max: 100 },
          location: { min: 2, max: 100 },
        };

        const dataToValidate = {name,email,message,location}
         const sanitizedData = await Utilities.sanitizeAndValidateInput(dataToValidate, validationRules);
         const created_at = new Date()
         const data = { ads_response_id, phone, created_at, ...sanitizedData };

         const saveToDB = await DB_Property_Model.SaveAdsResponse({data}) 

         if(!saveToDB){
           throw new CustomError({
             message: 'Unable to save your response at the moment',
             statusCode: 500,
             details: {}
           });
         }
          //send email notification to admin
          // Fire-and-forget email notification
          Helpers.sendEmailNotficationForNewAdsResponse(
            process.env.OFFICIAL_MAIL,
            // 'uche4flex@yahoo.com',
            'Jamesy'
          ).catch((error) => {
            console.error('Email notification failed:', error);
          });

         res.status(201).json({
           success: true,
           message: 'Message successfully sent.',
         });

      }catch(error){
        next(error)
      }
    }

    static async getAllAdsResponse(req, res, next) {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; //set to 10
        const offset = Math.max((page - 1) * limit, 0);

        const { result, total } = await DB_Property_Model.getAllAdsResponse({ limit, offset });

        if (result.length === 0) {
          throw new CustomError({
            message: 'No ads response found.',
            statusCode: 404,
            details: {},
          });
        }

        res.status(200).json({
          success: true,
          message: 'Ads response successfully fetched.',
          ads: result,
          hasMore: offset + result.length < total,
          total,
        });
      } catch (error) {
        next(error);
      }
    }

    static async deleteAdsResponse(req, res, next) {
      try {
        const validate = []
        const { id } = req.params;

        if(!id) validate.push('id')

        if(validate.length > 0){
          throw new CustomError({
            message: 'missing Ads response identification',
            statusCode: 400,
            details: { invalid_inputs: validate }
          });
        }

        const adsResponseExists = await DB_Property_Model.adsResponseExist({ id });

        if (!adsResponseExists) {
          throw new CustomError({
            message: 'Ads response not found.',
            statusCode: 404,
            details: {},
          });
        }

        const deleted = await DB_Property_Model.deleteAdsResponseById(id);

        if (!deleted) {
          throw new CustomError({
            message: 'Unable to delete Ads response.',
            statusCode: 404,
            details: {},
          });
        }

        res.status(200).json({
          success: true,
          message: 'Ads response successfully deleted.',
        });
      } catch (error) {
        next(error);
      }
    }

    static async getMyProperties(req, res, next) {
    try {
      const account_id = req.user.account_id;
      const page = parseInt(req.query.page) || 1;
      const limit = 6;
      const offset = Math.max((page - 1) * limit, 0);

      const { result, total } = await DB_Property_Model.getMyProperties({ account_id, limit, offset });

      if (result.length === 0) {
        throw new CustomError({
          message: 'You have not posted any properties.',
          statusCode: 404,
          details: {},
        });
      }

      // Map results to ensure image is an object
      const properties = result.map((item) => ({
        ...item,
        image: item.image || {}, // Ensure image is always an object
      }));

      res.status(200).json({
        success: true,
        message: 'Properties successfully fetched',
        properties,
        hasMore: offset + result.length < total,
        total,
      });
    } catch (error) {
      next(error);
    }
  }

 static async searchProperties(req, res, next) {
    try {
      const {
        title,
        country,
        state,
        address,
        status,
        category,
        available_for,
        min_price,
        max_price,
        property_features = {},
      } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = 6;
      const offset = Math.max((page - 1) * limit, 0);

      // Parse property_features if string
      const parsedFeatures = typeof property_features === 'string'
        ? JSON.parse(property_features)
        : property_features;

      const filters = {
        title,
        country,
        state,
        address,
        status,
        category,
        available_for,
        min_price: min_price ? parseFloat(min_price) : undefined,
        max_price: max_price ? parseFloat(max_price) : undefined,
        property_features: parsedFeatures,
        limit,
        offset,
      };

      const { result, total } = await DB_Property_Model.searchProperties(filters);

      if (result.length === 0) {
        throw new CustomError({
          message: 'Could not find any property that matches your request.',
          statusCode: 404,
          details: {},
        });
      }

      // Map results to ensure image is an object
      const properties = result.map((item) => ({
        ...item,
        image: item.image || {}, // Ensure image is always an object
      }));

      res.status(200).json({
        success: true,
        message: 'Properties successfully fetched',
        properties,
        hasMore: offset + result.length < total,
        total,
      });
    } catch (error) {
      next(error);
    }
  }

    static async uploadNewProperty(req, res, next) {
        let cloudinaryResults = []; // Track Cloudinary uploads for cleanup
        try {
        const {
            title,
            address,
            country,
            state,
            description,
            available_for,
            category,
            price,
            property_features,
            status,
        } = req.body;

        const fileData = req.files?.image || [];
        const files = Array.isArray(fileData) && fileData.length > 0 ? fileData : null;
        const invalid_inputs = [];
        const property_id = uuidv4();
        const account_id = req.user.account_id;
        const folder = `${process.env.CLOUDINARY_PROPERTY_IMAGE_FOLDER}`;

        // Validate images
        if (!files) {
            invalid_inputs.push({ name: 'image', message: 'At least one image is required' });
        }

        // Validate fields
        ['country', 'state', 'address', 
          'description', 'title', 'available_for', 'category', 
          'price', 'property_features', 'status'].forEach((field) => {
            if (!req.body[field]) {
            invalid_inputs.push({ name: field, message: `${field} is required` });
            }
        });

        if (invalid_inputs.length > 0) {
            throw new CustomError({
            message: 'missing a required fields',
            statusCode: 400,
            details: { fields: invalid_inputs },
            });
        }

        // Additional validations to sanitise inputs
        const validationRules = {
            title: { min: 2, max:300},
            address: { min: 5, max:300},
            country: { min: 2, max:100},
            state: { min: 2, max:100},
          description: { min: 10, max:5000},
          available_for: { min:2, max:50},
          category: { min: 4, max:50}, 
        }

        const dataToValidate = {title,address,country,state,description,available_for,category}
        await Utilities.sanitizeAndValidateInput(dataToValidate, validationRules);

        // Upload images to Cloudinary
        if (files) {
            cloudinaryResults = await Promise.all(
            files.map((file) => CloudinaryHelper.uploadToCloudinary(file, folder))
            );
            // console.log(cloudinaryResults)
        }

        // Prepare property resource
        const resource = {
            title,
            address,
            country,
            state,
            description,
            available_for,
            category,
            price: parseFloat(price),
            property_features: typeof property_features === 'string' ? JSON.parse(property_features || '{}') : property_features || {},
            status,
            account_id,
            property_id,
            created_at: new Date(),
        };

        // Insert property and images transactionally
         const { property, images } = await DB_Property_Model.uploadPropertyWithImages(resource, cloudinaryResults);

        // Prepare response
        res.status(201).json({
            success: true,
            message: 'Property uploaded successfully',
            resource: {
            ...property,
            images,
            },
        });
        } catch (error) {
        // Cleanup Cloudinary images if transaction fails
        if (cloudinaryResults.length > 0) {
            const publicIds = cloudinaryResults.map((result) => result.public_id);
            try {
            await CloudinaryHelper.deleteMultipleFromCloudinary(publicIds);
            console.log('Cleaned up Cloudinary images:', publicIds);
            } catch (cleanupError) {
            console.error('Failed to clean up Cloudinary images:', cleanupError.message);
            }
        }

        // Enhance error message
        const errorMessage = error.message.includes('Failed to save property and images')
            ? 'Failed to save property and images to database'
            : error.message;

        const customError =
            error instanceof CustomError
            ? error
            : new CustomError({
                message: errorMessage,
                statusCode: error.statusCode || 500,
                details: error.details || { error: error.message },
                });

        next(customError);
        }
  }

   static async getAllProperties(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 6;
      const offset = Math.max((page - 1) * limit, 0);

      const { result, total } = await DB_Property_Model.getAllProperty({ limit, offset });

      if (result.length === 0) {
        throw new CustomError({
          name: 'properties',
          message: 'Could not find any property at the moment.',
          statusCode: 404,
          details: {},
        });
      }

      // Map results to ensure image is an object (or empty object)
      const properties = result.map((item) => ({
        ...item,
        image: item.image || {}, // Ensure image is always an object
      }));

      res.status(200).json({
        success: true,
        message: 'Properties successfully fetched',
        properties,
        hasMore: offset + result.length < total,
        total,
      });
    } catch (error) {
      next(error);
    }
  }

    static async getPropertyById(req, res, next) {
    try {
      const property_id = req.params.id;
      const invalid_inputs = [];

      if (!property_id) {
        invalid_inputs.push({
          name: 'resource_id',
          message: 'Missing property id',
        });
      }

      const propertyExist = await DB_Property_Model.propertyExist({ property_id });
      if (!propertyExist) {
        invalid_inputs.push({
          name: 'Property',
          message: 'Property not found',
        });
      }

      if (invalid_inputs.length > 0) {
        throw new CustomError({
          message: 'Invalid or missing inputs',
          statusCode: 400,
          details: { fields: invalid_inputs },
        });
      }

      const property = await DB_Property_Model.getPropertyById({ property_id });

      if (!property) {
        throw new CustomError({
          message: 'Property not found',
          statusCode: 404,
          details: { propertyId: property_id },
        });
      }

      // Capitalize agent names
      const capitalizeFirstName = property.firstname?Utilities.capitalizeName(property.firstname):'';
      const capitalizeLastName = property.lastname?Utilities.capitalizeName(property.lastname): '';

      // Prepare response
      const formattedProperty = {
        ...property,
        images: property.images || [], // Ensure images is an array
        agent_profile_img: property.agent_profile_img || '', // Already a secure_url or empty
        posted_by: capitalizeFirstName && capitalizeLastName
          ? `${capitalizeFirstName} ${capitalizeLastName}`
          : '',
      };

      res.status(200).json({
        success: true,
        message: 'Property successfully fetched',
        property: formattedProperty,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProperty(req, res, next) {
      let uploadedPublicIds = [];
      const folder = `${process.env.CLOUDINARY_PROPERTY_IMAGE_FOLDER}`;
      try {
          const property_id = req.params.id;
          const fileData = req.files.image || []; // Expect Cloudinary results from multer
          const files = Array.isArray(fileData) && fileData.length > 0 ? fileData : null;
          const invalid_inputs = [];

          const update = { ...req.body };
          //  console.log(update)
          // Track uploaded images for cleanup

          // Validate inputs
          if (!property_id) {
            invalid_inputs.push({
              name: 'property_id',
              message: 'Missing property id',
            });
          }

          // Validate fields if they are present in the update
          if (update.title) {
            const validationRules = { title: { min: 2, max:300} };
            const dataToValidate = {title: update.title}
            await Utilities.sanitizeAndValidateInput(dataToValidate, validationRules);
            // validateText('title', update.title)
          }

          if (update.address) {
            const validationRules = { address: { min: 5, max: 300 } };
            const dataToValidate = { address: update.address };
            await Utilities.sanitizeAndValidateInput(dataToValidate, validationRules);
            // validateText('address', update.address)
          }

          if (update.description) {
            const validationRules = { description: { min: 10, max: 5000 } };
            const dataToValidate = { description: update.description };
            await Utilities.sanitizeAndValidateInput(dataToValidate, validationRules);
            // validateText('description', update.description)
          }

          // Check if property exists
          const property = await DB_Property_Model.getPropertyById({ property_id });
          if (!property) {
            throw new CustomError({
              message: 'Property not found',
              statusCode: 404,
              details: {},
            });
          }

          // Filter valid updates
          if(update.image) delete update.image // this removes the image as it's no longer on the databae property table
          const { validUpdates, invalid_fields } = Helpers.filterValidUpdates(property, update, {
            parseJSON: true,
          });

          if (invalid_inputs.length > 0 || invalid_fields.length > 0) {
            throw new CustomError({
              message: 'Invalid fields in update form',
              statusCode: 400,
              details: { invalid_inputs, invalid_fields },
            });
          }

          // Handle image uploads
          let cloudinaryResults = [];
          if (files) {
            const imageCount = await DB_Property_Model.getImageCount({ property_id });
            if (imageCount >= 10) {
              throw new CustomError({
                message: "Image limit reached. You can't upload more than 10 images per property",
                statusCode: 400,
                details: {},
              });
            }
            if (imageCount + files.length > 10) {
              throw new CustomError({
                message: `Image limit reached. You can only upload ${
                  10 - imageCount
                } more image(s)`,
                statusCode: 400,
                details: {},
              });
            }

        
            const uploadToCloudinary = await Promise.all(
                files.map((file) => CloudinaryHelper.uploadToCloudinary(file, folder))
                );

            cloudinaryResults = uploadToCloudinary?.map((file, index) => ({
              public_id: file.public_id,
              secure_url: file.secure_url,
              format: file.format,
              version: file.version,
            }));

            uploadedPublicIds = cloudinaryResults.map((result) => result.public_id);

          }

        // Update property and images
          validUpdates.updated_at = new Date();
          
          const updated = await DB_Property_Model.updateProperty({
            property_id,
            updates: validUpdates,
            cloudinaryResults,
          });

          // console.log('this is to be added to db',validUpdates)

        res.status(200).json({
          success: true,
          message: 'Property updated successfully',
        });

      } catch (error) {
      // Clean up uploaded Cloudinary images on failure
        if (uploadedPublicIds.length > 0) {
            try {
            await CloudinaryHelper.deleteMultipleFromCloudinary(uploadedPublicIds);
            } catch (err) {
            console.error('Failed to clean up Cloudinary images:', err.message);
            }
        }
        next(error);
      }
  }


    static async deleteImageFromPropertyImage(req, res, next) {
    try {
      const { imageUrl } = req.query; // Cloudinary public_id
      const property_id = req.params.id;
      const invalid_inputs = [];
      let deletedFromCloudinary = false;
    //   let deletedFromDB = false;

      // Validate inputs
      if (!property_id) {
        invalid_inputs.push({
          name: 'property_id',
          message: 'Missing property id',
        });
      }
      if (!imageUrl) {
        invalid_inputs.push({
          name: 'imageUrl',
          message: 'Missing image public_id',
        });
      }

      // Check if property exists
      const propertyExist = await DB_Property_Model.propertyExist({ property_id });
      if (!propertyExist) {
        invalid_inputs.push({
          name: 'property',
          message: 'Property not found',
        });
      }

      if (invalid_inputs.length > 0) {
        throw new CustomError({
          message: 'Missing Image details',
          statusCode: 400,
          details: { invalid_inputs },
        });
      }

       // Check remaining images
      const imageCount = await DB_Property_Model.getImageCount({ property_id });
      if (imageCount <= 1) {
         throw new CustomError({
          message: 'Property is expected to have one image',
          statusCode: 400,
          details: {},
        });
      }
        //check if image exist in database and cloud
       const existsInDB = await DB_Property_Model.checkImageExistsInDB(property_id, imageUrl);
       const existsInCloudinary = await CloudinaryHelper.checkFileExists(imageUrl);

       if (!existsInCloudinary && !existsInDB) {
         throw new CustomError({
          message: 'Image does not exist or may have been moved to another location',
          statusCode: 404,
          details: {},
        });
      }

      // Delete from Cloud if it exists
      if (existsInCloudinary) {
        const cloudinaryResult = await CloudinaryHelper.deleteFromCloudinary(imageUrl);
        //  console.log('delete from cloudinary',cloudinaryResult)
        if(cloudinaryResult.result !== 'ok') {
          throw new CustomError({
          message: 'Image not found',
          statusCode: 400,
          details: {},
        });
        }
        deletedFromCloudinary = true;
      }

      // Delete image from database
      if(deletedFromCloudinary){
        const result = await DB_Property_Model.removeImageFromAPropertyImages({
        property_id,
        public_id: imageUrl,
      });

      if(!result){
        throw new CustomError({
          message: 'failed to delete image from storage',
          statusCode: 400,
          details: {},
        });
      }
        res.status(200).json({
            success: true,
            message: `Image successfully deleted`,
        });
      }
      
    } catch (error) {
    next(error)
    }
  }

   static async deletePropertyById(req, res, next) {
    try {
      const property_id = req.params.id;
      const invalid_inputs = [];
      let isDeleted = false

      // Validate inputs
      if (!property_id) {
        invalid_inputs.push({
          name: 'property_id',
          message: 'Missing property id',
        });
      }

      // Check if property exists
      const propertyExist = await DB_Property_Model.propertyExist({ property_id });
      if (!propertyExist) {
        invalid_inputs.push({
          name: 'property',
          message: 'Property not found',
        });
      }

      if (invalid_inputs.length > 0) {
        throw new CustomError({
          message: 'Invalid inputs',
          statusCode: 400,
          details: { invalid_inputs },
        });
      }

       const property = await DB_Property_Model.getPropertyById({ property_id });

       const publicIds = property.images?.map((publicId) => publicId.public_id);

       

       //check if publicIds exist in cloud
       const existInCloud = await CloudinaryHelper.checkMultipleFilesExist(publicIds);
    //    console.log(existInCloud)

       const publicIdsTobeDeleted = existInCloud
       .filter((publicId)=>publicId.exists)
       .map((publicId)=>publicId.public_id);

     

       if(publicIdsTobeDeleted.length > 0){
        const deleteImageFromCloud = await CloudinaryHelper.deleteMultipleFromCloudinary(publicIdsTobeDeleted);
        // console.log('testing')
       }


      // Delete property and associated images from database
      const deleteProperty = await DB_Property_Model.DeletePropertyById({ property_id });

      if (!deleteProperty) {
        throw new CustomError({
          message: 'Failed to delete property',
          statusCode: 400,
          details: {},
        });
      }

      res.status(200).json({
        success: true,
        message: 'Property successfully deleted',
      });
    } catch (error) {
      next(error);
    }
  }

// static async deletePropertyById(req,res,next){
//         try{
//             const property_id = req.params.id;
//             console.log(property_id)
//             const invalid_inputs = [];

//             if(!property_id){
//                 invalid_inputs.push({
//                     name:'property id',
//                     message:'missing property id'
//                 })
//             }
//             //this is just a double layer check, the authorization already handles this.
//             const propertyExist = DB_Property_Model.propertyExist({property_id});

//             if(!propertyExist){
//                 invalid_inputs.push({
//                     name:'property',
//                     message:'property not found'
//                 })
//             }

//             const property = await DB_Property_Model.getPropertyById({ property_id });

//             if(!property){
//                  invalid_inputs.push({
//                     name:'property',
//                     message:'property not found'
//                 })
//             }

//              if(invalid_inputs.length>0){
//                 throw new CustomError({
//                     message: 'Invalid inputs',
//                     statusCode: 400,
//                     details:{invalid_inputs},
//                 })
//             }

//             const propertyImage = property[0].image
//             const directoryPath = '../../public/uploads/images';
//             const addFilePathToPropertyImage = propertyImage.map((item)=>{
//                 const imgPath = path.join(__dirname,directoryPath,item)
//                 return imgPath
//             })

//             const deleteProperty = await DB_Property_Model.DeletePropertyById({property_id});

//             if(!deleteProperty){
//                 throw new CustomError({
//                     message:'Failed to delete property',
//                      statusCode: 400,
//                     details:{},
//                 })
//             }

//             try{
//                 await Promise.all(addFilePathToPropertyImage.map(async(file)=>{
//                         await fsp.unlink(file);
//                     }))
//             }catch(error){
//                  console.warn('Failed to delete file:', error.message);
//             }
            
//             res.status(200).json({
//                 success:true,
//                 message:'Property successfully deleted',
//             });
           
//         }catch(error){
//             next(error)
//         }
//      }

}

module.exports = Property