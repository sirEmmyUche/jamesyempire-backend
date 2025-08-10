require('dotenv').config();
const DB_Account_Model = require('../models/account');
const {CustomError} = require('../libraries/custom_error');
const { v4: uuidv4 } = require('uuid'); 
const validator = require('validator');
const Utilities = require('../utils/utilities')
const bcrypt = require('bcryptjs');
const Helpers = require('../helpers/helpers')
// const Helpers = require('../helpers/helpers')
const CloudinaryHelper = require('../helpers/cloudinary')
const path = require('path');
const fsp = require('fs/promises');
const fs = require('fs')

class Account {
    static async updateAccount(req, res, next) {
      let uploadedPublicId = null // Track uploaded image for cleanup
      try {
        const account_id = req.user.account_id; // From authMiddleware
        const fileData = req.files?.profile_pics || [];
        const files = Array.isArray(fileData) && fileData.length > 0 ? fileData : null;
        const update = { ...req.body }; 
        let profileImage = null;
        const invalid_inputs = [];

        // Validate inputs
        const validateText = (field, value, maxLength = 255) => {
          if (!value || value.trim() === '') {
            invalid_inputs.push({ name: field, message: 'Required' });
          } else if (/[\x00-\x1F\x7F]/.test(value)) {
            invalid_inputs.push({ name: field, message: 'Contains unsupported characters' });
          } else if (!new RegExp(`^.{1,${maxLength}}$`).test(value)) {
            invalid_inputs.push({ name: field, message: `Exceeded ${maxLength} maximum characters` });
          }
        };

        if(update.firstname) validateText('firstname', update.firstname);
        if(update.lastname) validateText('lastname', update.lastname);

        if(update.phone){
            // validateText('phone', update.phone, 20)
            const isValid = Utilities.validatePhoneNumber(update.phone);
            if(!isValid){
                invalid_inputs.push({ name: 'phone', message: 'Invalid phone details' });
            }
            const getCurrentPhoneNumber = await DB_Account_Model.getPhoneNumberByAccountId({account_id});
            if(getCurrentPhoneNumber.phone){
              if(getCurrentPhoneNumber.phone !== update.phone){
                const doesPhoneNumberAlreadyExist = await DB_Account_Model.phoneNumberExist({phone:update.phone})
                // console.log(doesPhoneNumberAlreadyExist)
                if(doesPhoneNumberAlreadyExist){
                  throw new CustomError({
                    message: 'Phone number you wish to update to already exist.',
                    statusCode: 400,
                    details: {},
                  });
                }
              }
            }
            // console.log('phone',getCurrentPhoneNumber)
        }

        if(update.email){
          if (!validator.isEmail(update.email)) {
              invalid_inputs.push({
                  name: 'email',
                  message: 'Email address not acceptable'
              });
          }
          if(update.email !== req.user.email) {
            const emailExists = await DB_Account_Model.emailAddressExist({ email: update.email });
            if (emailExists) {
               throw new CustomError({
                  message: 'Email you wish to update to already exist.',
                  statusCode: 400,
                  details: {},
              });
            }
          }
        }
      // Reject any request with role update
      if (update.role) {
        throw new CustomError({
            message: 'Unauthorised request',
          statusCode: 403,
          details: {},
        })
      }
        // Check if account exists
        const account = await DB_Account_Model.getAccountById({account_id});

        if (!account) {
          throw new CustomError({
            message: 'Account not found',
            statusCode: 404,
            details: {},
          });
        }

        let sourceToValidateWith = account[0]

      // const columnName = await DB_Account_Model.getColumnNames({tableName:'accounts'})
      // console.log('column name', columnName)

      if(update.profile_pics) delete update.profile_pics // deleted to avoid conflicts in checking inputs values
      
      const { validUpdates, invalid_fields } = Helpers.filterValidUpdates(sourceToValidateWith, update, {
          parseJSON: true,
        });
        
        if (invalid_inputs.length > 0 || invalid_fields.length > 0) {
          throw new CustomError({
            message: 'Invalid or wrong inputs.',
            statusCode: 400,
            details: { invalid_inputs, invalid_fields },
          });
        }

        // Handle profile picture
        if (files && files.length > 0) {
          if (files.length > 1) {
            throw new CustomError({
              message: 'Only one profile picture is allowed',
              statusCode: 400,
              details: {},
            });
          }

          const file = files[0];

          // Delete existing profile picture from Cloudinary if it exists
          if (account[0].profile_img) {
            try {
              const deleteResult = await CloudinaryHelper.deleteFromCloudinary(account[0].profile_img);
              if (deleteResult.result !== 'ok') {
                console.warn(`Failed to delete existing profile image ${account[0].profile_img} from Cloudinary`);
              }
            } catch (error) {
              console.warn(`Error deleting existing profile image: ${error.message}`);
            }
          }

          // Upload new profile picture
          let folder = `${process.env.CLOUDINARY_PROFILE_PICS_FOLDER}`
          const uploadResult = await CloudinaryHelper.uploadToCloudinary(file,folder);
          // console.log('profile-upload',uploadResult)

          uploadedPublicId = uploadResult.public_id;
          profileImage = {
            public_id: uploadResult.public_id,
            metadata: {
              secure_url: uploadResult.secure_url,
              format: uploadResult.format,
              version: uploadResult.version,
            },
          };
        }

        validUpdates.updated_at = new Date();

        const updatedAccount = await DB_Account_Model.updateAccount({ account_id, updates: validUpdates, profileImage, });
        // console.log(updatedAccount )

            if (!updatedAccount || updatedAccount === false) {
            throw new CustomError({
              message: 'Failed to update account',
              statusCode: 400,
              details: {},
            });
          }

          res.status(200).json({
            success: true,
            message: 'Account updated successfully',
            user: updatedAccount,
          })

    } catch (error) {
      // Clean up uploaded Cloudinary image on failure
      if (uploadedPublicId) {
        try {
          await CloudinaryHelper.deleteFromCloudinary(uploadedPublicId);
        } catch (err) {
          console.error('Failed to clean up Cloudinary image:', err.message);
        }
      }
      next(error);
    }
  }
   

  static async changePassword(req, res, next){
        try{
             res.status(200).json({
                success:true,
                message:'it is working',
                // user
            })
        }catch(error){
            next(error)
        }
  }

  static async login(req,res,next){
        try{
            const {password, email} = req.body;
            // const profilePicUrl =  `${process.env.PROFILE_PIC_BASEURL}`
            const invalid_inputs = [];
            if(!email){
                invalid_inputs.push({
                    name:'email',
                    message:'email field is required'
                })
            }else if (!validator.isEmail(email)) {
                invalid_inputs.push({
                    name: 'email',
                    message: 'Email address not acceptable'
                });
            
            }else if(!await DB_Account_Model.emailAddressExist({email})){
                invalid_inputs.push({
                    name: 'email_address',
                    message: 'Invalid login credentials'
                });
            }
           
            // const encryptEmail = await Utilities.encrypt(email)
            const result = await DB_Account_Model.getAccountLoginCredentialsByEmail({email});
         
            if(!result){
                 invalid_inputs.push({
                    name: 'Login credentials',
                    message: 'Invalid email or password'
                });
            } else if(!password){
                invalid_inputs.push({
                    name:'Password',
                    message:'Password field is required'
                })
            }else if(!await bcrypt.compare(password, result.password)){
                 invalid_inputs.push({
                    name:'Password',
                    message:'Incorrect email or password'
                })
            }

             if (invalid_inputs.length > 0) {
                throw new CustomError({
                    message: 'Invalid or missing inputs',
                    statusCode: 400,
                    details: {fields: invalid_inputs}
                });
            }

            const payload = {
                account_id:result.account_id,
                // email: result[0].email,
                // role: result[0].role
            }
            const token = await Utilities.generateJwtToken({payload});

            if(!token){
                 throw new CustomError({
                    message: 'An error occured',
                    statusCode: 500,
                    details: {}
                });
            }

        
            const user = {
                token,
                account_id:result.account_id,
                email: result.email,
                role: result.role,
                firstname: result.firstname?Utilities.capitalizeName(result.firstname):'',
                lastname:  result.lastname?Utilities.capitalizeName(result.lastname):'',//result[0].lastname,
                profile_pic:result.profile_img_metadata,
                profile_img_public_id:result.profile_img_public_id

                // phone:result[0].phone
            }

             res.status(200).json({
                success:true,
                message:'login was successful',
                user
            })

        }catch(error){
            next(error)
        }
    }

    static async createAccount(req,res,next){
        try{
            const {firstname,lastname,phone, email, password} = req.body;
            const account_id = uuidv4(); 
            const invalid_inputs = [];
            
            if(!firstname){
                invalid_inputs.push({
                    name:'first_name',
                    message:'first name field is required'
                })
            }else if(!/^[a-z ,.'-]+$/i.test(firstname)){
                invalid_inputs.push({
                    name: 'first_name',
                    message: 'Invalid input'
                })
            }
            if(!lastname){
                invalid_inputs.push({
                    name:'last_name',
                    message:'last name field is required'
                })
            }else if(!/^[a-z ,.'-]+$/i.test(lastname)){
                invalid_inputs.push({
                    name: 'last_name',
                    message: 'Invalid input'
                })
            }
            if(!email){
                invalid_inputs.push({
                    name:'email',
                    message:'email field is required'
                })
            }else if (!validator.isEmail(email)) {
                invalid_inputs.push({
                    name: 'email',
                    message: 'Email address not acceptable'
                });
            
            }else if(await DB_Account_Model.emailAddressExist({email})){
                invalid_inputs.push({
                    name: 'email_address',
                    message: 'Email address already exists'
                });
            }
            if(!password){
                invalid_inputs.push({
                    name:'password',
                    message:'password is required'
                })
            }else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*\-_+.?])(?=.{8,})/.test(password)) {
                invalid_inputs.push({
                    name: 'password',
                    message: 'Password must be at least 8 characters long. It must contain lowercase, uppercase, number, and special character'
                });
            }
             // check if there are invalid inputs
            if (invalid_inputs.length > 0) {
                throw new CustomError({
                    message: 'Invalid or missing inputs',
                    statusCode: 400,
                    details: {fields: invalid_inputs}
                });
            }

            const encryptedEmail = await Utilities.encrypt(email);
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);

            const userData = {
                email:email,
                encryptedEmail:encryptedEmail,
                hashPassword:hash,
                firstname:firstname,
                lastname:lastname,
                account_id:account_id,
                created_at:new Date(),
                role:'user',
                phone:phone
            }

            await DB_Account_Model.createAccount({...userData});

            const user = {
                firstname:firstname,
                lastname:lastname,
                account_id:account_id,
                created_at:new Date(),
                role:'user',
                phone:phone
            }
 
            res.status(200).json({
               success:true,
               message:'Accout creation was successful',
               user
            })
            
        }catch(error){
            next(error)
        }
    }
}

module.exports = Account