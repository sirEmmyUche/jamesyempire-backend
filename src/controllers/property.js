const {CustomError} = require('../libraries/custom_error');
const { v4: uuidv4 } = require('uuid'); 
const Utilities = require('../utils/utilities');
const fsp = require('fs/promises');
const fs = require('fs')
const DB_Property_Model = require('../models/property')
const Helpers = require('../helpers/helpers')
const path = require('path');
// const DB_Account_Model = require('../models/account');

class Property{
    static async getMyProperties(req, res, next){
        try{
            const baseUrl = `${process.env.IMGBASEURL}`;
            const account_id = req.user.account_id;
             const page = req.query.page || 1
             const limit = 6
             const offset = Math.max((page - 1) * limit, 0);

            const result = await DB_Property_Model.getMyProperties({account_id,limit,offset});
            if(!result){
                throw new CustomError({
                    message:'No property found.',
                    statusCode:404,
                    details:{},
                })
            }
             const properties = result.result.map((item)=>{
                return {
                    ...item,
                    image:`${baseUrl}/${item.image}`
                }
            }) 
            res.status(200).json({
                success: true,
                message:'Property successfully fetched',
                properties,
                hasMore: offset + result.length < result.total,
                total:result.total
            })
        }catch(error){
            next(error)
        }
    }

    static async  searchProperties(req, res, next) {
        try {
            // console.log(req.query)
            const baseUrl = `${process.env.IMGBASEURL}`;
            const {title,country,state,address,status,category,available_for,
            min_price,max_price,property_features = {},
            } = req.query;
            const page = req.query.page || 1
            const limit = 6
            const offset = Math.max((page - 1) * limit, 0);

            // Ensure property_features is a parsed object
            const parsedFeatures = typeof property_features === 'string'
            ? JSON.parse(property_features)
            : property_features;

            const filters = {title,country,state,address,status,category,available_for,
            min_price,max_price,
            property_features: parsedFeatures,
            limit: parseInt(limit),
            offset: parseInt(offset),
            };
            const result = await DB_Property_Model.searchProperties(filters);
            if(!result){
                throw new CustomError({
                    message:'Could not find any property that matches your request.',
                    statusCode:404,
                    details:{},
                })
            }
            // console.log(result)
            const properties = result.result.map((item)=>{
                return {
                    ...item,
                    image:`${baseUrl}/${item.image}`
                }
            }) 
            res.status(200).json({
                success: true,
                message:'Property successfully fetched',
                properties,
                hasMore: offset + result.length < result.total,
                total:result.total
            })
            // res.json(result);
        } catch (err) {
            next(err);
        }
        }
    static async uploadNewProperty(req, res, next) {
        try {
            const {
                title, address, country, state, description,
                available_for, category, price, property_features, status
            } = req.body;

            const fileData = req.files?.images || [];
            const files = Array.isArray(fileData) && fileData.length > 0 ? fileData : null;

            const invalid_inputs = [];
            const property_id = uuidv4();
            const account_id = req.user.account_id;
  
            if (!files) {
                invalid_inputs.push({ name: 'files', message: 'Image is needed' });
            }

            // Validate fields
            const validateText = (field, value, maxLength = 300) => {
                if (!value || value.trim() === '') {
                    invalid_inputs.push({ name: field, message: 'required' });
                } else if (/[\x00-\x1F\x7F]/.test(value)) {
                    invalid_inputs.push({ name: field, message: 'Contains unsupported characters' });
                } else if(!new RegExp(`^.{1,${maxLength}}$`).test(value)) {// (value.length >maxLength)
                    invalid_inputs.push({ name: field, message: `Exceeded ${maxLength} maximum characters` });
                }
            };

            validateText('title', title);
            validateText('address', address);
            validateText('description', description);

            if (!country || !state) {
                invalid_inputs.push({ name: 'country_state', message: 'Country and State are required' });
            }

            ['available_for', 'category', 'price', 'property_features', 'status'].forEach(field => {
                if (!req.body[field]) {
                    invalid_inputs.push({ name: field, message: 'required' });
                }
            });

            if (invalid_inputs.length > 0) {
                throw new CustomError({
                    message: 'Invalid or missing inputs',
                    statusCode: 400,
                    details: { fields: invalid_inputs }
                });
            }

            const image = files.map(file => file.filename);

            const resource = {
                title, address, country, state, description,
                available_for, category, price, status,
                image, account_id, property_id,
                property_features, 
                created_at: new Date()
            };

            await DB_Property_Model.uploadProperty(resource);

            res.status(201).json({
                 success: true,
                 message: "Property uploaded successfully",
                resource });

        } catch (error) {
            // Cleanup uploaded files if there's an error
            const fileData = req.files?.images || []; // Ensure `req.files` is always an array
            const files = Array.isArray(fileData) && fileData.length > 0 ? fileData : null;
            if(files){
                 try {
                    await Promise.all(files.map(async(file)=>{
                        await fsp.unlink(file.path);
                    }))
                 } catch (err) {
                        console.error('Failed to delete file:', err.message);
                    }
                }
            next(error);
        }
    }
    static async getAllProperties(req,res,next){
        try{
            const baseUrl = `${process.env.IMGBASEURL}`;
            const page = req.query.page || 1
            const limit = 6;
             const offset = Math.max((page - 1) * limit, 0);
            const {result,total} = await DB_Property_Model.getAllProperty({limit,offset});
            if(!result){
                throw new CustomError({
                    name:'properties',
                    message:'Could not find any property at the moment.',
                    statuCode:404,
                    details:{}
                })
            }
            const properties = result.map((item)=>{
                return {
                    ...item,
                    image:`${baseUrl}/${item.image}`,
                }
            }) 
            res.status(200).json({
                success: true,
                message:'Property successfully fetched',
                properties,
                hasMore: offset + result.length < total,
                total:total
            })
        }catch(error){
            next(error)
        }
    }

    static async getPropertyById(req,res,next){
        try{
            const property_id = req.params.id;
            const invalid_inputs = [];
            const baseUrl = `${process.env.IMGBASEURL}`;
            const profilePicUrl =  `${process.env.PROFILE_PIC_BASEURL}`
            if(!property_id){
                invalid_inputs.push({
                    name:'resource_id',
                    message:'missing property id'
                })
            }
            const propertyExist = await DB_Property_Model.propertyExist({property_id});
            if(!propertyExist){
                 invalid_inputs.push({
                    name:'Property',
                    message:'Property not found'
                })
            }
            if (invalid_inputs.length > 0) {
                throw new CustomError({
                    message: 'Invalid or missing inputs',
                    statusCode: 400,
                    details: { fields: invalid_inputs }
                });
            }
            const resource = await DB_Property_Model.getPropertyById({property_id})
            if(!resource){
                throw new CustomError({
                    mesaage:'Property not found',
                    statusCode: 404,
                    details: {}
                })
            }
            const property = resource.map((item)=>{
                const capitalizeFirstName = `${item?.firstname.charAt(0).toUpperCase()}${item?.firstname.slice(1)}`
                const capitalizeLastName = `${item?.lastname.charAt(0).toUpperCase()}${item?.lastname.slice(1)}`
                return {
                    ...item,
                    agent_profile_img:item.agent_profile_img !== ''?`${profilePicUrl}/${item.agent_profile_img}`:item.agent_profile_img,
                    image:item.image.map((item)=>{
                        return `${baseUrl}/${item}`
                    }),
                    // posted_by:`${item?.firstname} ${item.lastname}`
                    posted_by:`${capitalizeFirstName} ${capitalizeLastName}`
                }
            })
            res.status(200).json({
                success: true,
                message:'Property successfully fetched',
                property:property[0]
            })
           
        }catch(error){
            next(error)
        }
    }

    static async updateProperty(req, res, next) {
        try {
            const property_id = req.params.id;
            const fileData = req.files?.images || []; // Ensure `req.files` is always an array
            const files = Array.isArray(fileData) && fileData.length > 0 ? fileData : null;
            // const imageFolderPath = path.join(__dirname, '../../public/uploads/images');
            const invalid_inputs = []
            const update = {...req.body};
            console.log('update:', update)

            if (!property_id) {
                invalid_inputs.push({
                    name:'Property_id',
                    messaqge:'missing property_id'
                })
            }
            const validateText = (field, value, maxLength = 300) => {
                if (!value || value.trim() === '') {
                    invalid_inputs.push({ name: field, message: 'required' });
                } else if (/[\x00-\x1F\x7F]/.test(value)) {
                    invalid_inputs.push({ name: field, message: 'Contains unsupported characters' });
                } else if(!new RegExp(`^.{1,${maxLength}}$`).test(value)) {// (value.length >maxLength)
                    invalid_inputs.push({ name: field, message: `Exceeded ${maxLength} maximum characters` });
                }
            };
            if(update.title){
                validateText('title', update.title);
            }else if(update.address){
                validateText('address', update.address);
            }else if(update.description){
                validateText('description', update.description);
            }
            
            const result = await DB_Property_Model.getPropertyById({ property_id });
            // console.log('result:',result)
            const property = Array.isArray(result) ? result[0] : result;
            // const property = await DB_Property_Model.getPropertyById({ property_id });
            if (!property) {
            throw new CustomError({
                message: 'Property not found',
                statusCode: 404,
                details: {},
            });
            }

            // Run validation and sanitization
            // console.log(update)
            const { validUpdates, invalid_fields } = Helpers.filterValidUpdates(property, update, {
            parseJSON: true,
            });

            if (invalid_inputs.length > 0 || invalid_fields.length>0) {
            throw new CustomError({
                message: 'Invalid fields in update form',
                statusCode: 400,
                details: {invalid_inputs},
            });
            }

            // Handle image logic
            if(files){
                if(property.image.length == 10){
                    throw new CustomError({
                        message: 'Image limit reached, you cant upload more images',
                        statusCode: 400,
                        details: {},
                    })
                }else if((property.image.length + files.length)>10){
                    // console.log((property.image.length + files.length))
                    throw new CustomError({
                        message: 'Image limit reached, you cant upload more images',
                        statusCode: 400,
                        details: {},
                    })
                }
                const image = files.map(file => file.filename);
                validUpdates.image = image;
            }
             validUpdates.updated_at = new Date();

            // Update DB
            console.log(validUpdates)
            // const updated = await DB_Property_Model.updateProperty({property_id, updates: validUpdates,});

            res.status(200).json({
            success: true,
            message: 'Property updated successfully',
            // data: updated,
            });
        } catch (error) {
            const fileData = req.files?.images || []; // Ensure `req.files` is always an array
            const files = Array.isArray(fileData) && fileData.length > 0 ? fileData : null;
            if(files){
                 try {
                    await Promise.all(files.map(async(file)=>{
                        await fsp.unlink(file.path);
                    }))
                 } catch (err) {
                        console.error('Failed to delete file:', err.message);
                    }
                }

            next(error);
        }  
    }

     static async deleteImageFromPropertyImage(req,res,next){
        try{
            const imageUrl = req.body.imageUrl
            const property_id = req.params.id;
            const invalid_inputs = [];

            //Not required here because it's handled in the authorization middleware
            if(!property_id){
                invalid_inputs.push({
                    name:'property id',
                    message:'missing property id'
                })
            }

            if(!imageUrl){
                invalid_inputs.push({
                    name:'property id',
                    message:'missing property id'
                })
            }

            const propertyExist = await DB_Property_Model.propertyExist({property_id});

             if(!propertyExist){
                invalid_inputs.push({
                    name:'property',
                    message:'Property not found'
                })
            }


            if(invalid_inputs.length>0){
                throw new CustomError({
                    message: 'Invalid inputs',
                    statusCode: 400,
                    details:{invalid_inputs},
                })
            }
            
            const getFilename = (url)=>{
                return url.split('/').pop();
            }
            const filename =getFilename(imageUrl)
            const imgPath = path.join(__dirname, '../../public/uploads/images', filename);

            const imageRemoved = await DB_Property_Model.removeImageFromAPropertyImages({property_id,filename});

            if(!imageRemoved){
                throw new CustomError({
                    message:'Unable to delete image',
                    statusCode: 400,
                    details:{},
                })
            }

            await fsp.unlink(imgPath);

            res.status(200).json({
                success:true,
                message:'Imaged successfully deleted'
            });
        }catch(error){
            next(error)
        }
     }

     static async deletePropertyById(req,res,next){
        try{
            const property_id = req.params.id;
            const invalid_inputs = [];

            if(!property_id){
                invalid_inputs.push({
                    name:'property id',
                    message:'missing property id'
                })
            }
            //this is just a double layer check, the authorization already handles this.
            const propertyExist = DB_Property_Model.propertyExist({property_id});

            if(!propertyExist){
                invalid_inputs.push({
                    name:'property',
                    message:'property not found'
                })
            }

            const property = await DB_Property_Model.getPropertyById({ property_id });

            if(!property){
                 invalid_inputs.push({
                    name:'property',
                    message:'property not found'
                })
            }

             if(invalid_inputs.length>0){
                throw new CustomError({
                    message: 'Invalid inputs',
                    statusCode: 400,
                    details:{invalid_inputs},
                })
            }

            const propertyImage = property[0].image
            const directoryPath = '../../public/uploads/images';
            const addFilePathToPropertyImage = propertyImage.map((item)=>{
                const imgPath = path.join(__dirname,directoryPath,item)
                return imgPath
            })

            const deleteProperty = await DB_Property_Model.DeletePropertyById({property_id});

            if(!deleteProperty){
                throw new CustomError({
                    message:'Failed to delete property',
                     statusCode: 400,
                    details:{},
                })
            }

            try{
                await Promise.all(addFilePathToPropertyImage.map(async(file)=>{
                        await fsp.unlink(file);
                    }))
            }catch(error){
                 console.warn('Failed to delete file:', error.message);
            }
            
            res.status(200).json({
                success:true,
                message:'Property successfully deleted',
            });
           
        }catch(error){
            next(error)
        }
     }

}

module.exports = Property