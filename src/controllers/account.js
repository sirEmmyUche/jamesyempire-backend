require('dotenv').config();
const DB_Account_Model = require('../models/account');
const {CustomError} = require('../libraries/custom_error');
const { v4: uuidv4 } = require('uuid'); 
const validator = require('validator');
const Utilities = require('../utils/utilities')
const bcrypt = require('bcryptjs');

class Account {
    static async login(req,res,next){
        try{
            const {password, email} = req.body;
            const profilePicUrl =  `${process.env.PROFILE_PIC_BASEURL}`
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
            }else if(!await bcrypt.compare(password, result[0].password)){
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
                account_id:result[0].account_id,
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
                account_id:result[0].account_id,
                email: result[0].email,
                role: result[0].role,
                firstName: `${result[0]?.firstname.charAt(0).toUpperCase()}${result[0]?.firstname.slice(1)}`,
                lastName:  `${result[0]?.lastname.charAt(0).toUpperCase()}${result[0]?.lastname.slice(1)}`,//result[0].lastname,
                profile_pic:result[0]?.profile_img !== ''?`${profilePicUrl}/${result[0].profile_img}`:result[0].profile_img,
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
            const {firstName,lastName,phone, email, password} = req.body;
            const account_id = uuidv4(); 
            const invalid_inputs = [];
            
            if(!firstName){
                invalid_inputs.push({
                    name:'first_name',
                    message:'first name field is required'
                })
            }else if(!/^[a-z ,.'-]+$/i.test(firstName)){
                invalid_inputs.push({
                    name: 'first_name',
                    message: 'Invalid input'
                })
            }
            if(!lastName){
                invalid_inputs.push({
                    name:'last_name',
                    message:'last name field is required'
                })
            }else if(!/^[a-z ,.'-]+$/i.test(lastName)){
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
                firstName:firstName,
                lastName:lastName,
                account_id:account_id,
                created_at:new Date(),
                role:'user',
                phone:phone
            }

            await DB_Account_Model.createAccount({...userData});

            const user = {
                firstName:firstName,
                lastName:lastName,
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