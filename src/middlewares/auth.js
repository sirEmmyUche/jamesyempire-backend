require('dotenv').config();
const jwt = require('jsonwebtoken');
const {CustomError} = require('../libraries/custom_error');
const DB_Account_Model = require('../models/account');
const AuthHelperModel = require('../models/auth_helper')
const permission = require('../config/permission')

class Auth {
    // verify token for websocket live chat 
    static async  verifySocketToken(socket){
        try{
            const isToken = socket.handshake.auth.token;
            // console.log('socket-token:',isToken)

            if (!isToken) throw new Error('Missing token');

            const [bearer, token] = isToken.trim().split(/[ ]+/);

            if (bearer !== 'Bearer' || !token) throw new Error('Invalid token format');

            const decoded = jwt.verify(token, process.env.JWT_SECRETE_KEY);

            if(!decoded) throw new Error('Invalid token');

            const account_id = decoded.account_id;

            const userExists = await DB_Account_Model.accountExist({ account_id });
            
            if (!userExists) throw new Error('Invalid account credentials');

            const userDetails = await DB_Account_Model.getAccountById({ account_id });
            return userDetails[0]; // attach to socket
        }catch(error){
            throw error
        }
    } 

     static async verifyToken(req, res, next) {
        try {
            // get authorization header
            const auth_header = req.headers['authorization'];
            // console.log(auth_header)

            // check if authorisation header is defined
            if (!auth_header) {
                // throw error
                throw new CustomError({
                    message: "Authorization header not defined", 
                    statusCode: 401, 
                    details: {}
                });
            }

            // extract token type and token
            const [token_type, token] = auth_header.trim().split(/[ ]+/);

            // check if token type is bearer token
            // console.log('token',token)
            if (token_type !== 'Bearer') {
                // throw error
                throw new CustomError({
                    message: "Invalid token type", 
                    statusCode: 400,  
                    details: {}
                });
            }

            // check if token is defined
            if (!token) {
                // throw error
                throw new CustomError({
                    message: "Invalid token", 
                    statusCode: 400, 
                    details: {}
                });
            }

            // validate token
            jwt.verify(
                token, 
                process.env.JWT_SECRETE_KEY,  
                (err, decoded) => {
                    if (err) {
                        // check if token has expired error
                        if (err.name == 'TokenExpiredError') {
                            // return error
                            res.status(400);
                            res.json({
                                success: false,
                                error: {
                                    message: "Token has expired",
                                    details: {}
                                }
                            });

                            return;
                        }

                        // return error
                        res.status(400);
                        res.json({
                            success: false,
                            error: {
                                message: "Invalid token",
                                details: {}
                            }
                        });

                        return;
                    }

                    // attach token body to request user object

                    req.decoded = decoded;

                    // move to next middleware
                    next();
                }
            );

        } catch (error) {
            // pass the error to next middleware
            next(error);
        }
    }

    //authentication

    static async authentication(req, res, next){
        try{
            const account_id = req.decoded?.account_id;
            const isAccountExist = await DB_Account_Model.accountExist({account_id});
            if(!isAccountExist){
                throw new CustomError({
                        message: "Invalid account credentials", 
                        statusCode: 404, 
                        details: {}
                    });
            }
            const userDetails = await DB_Account_Model.getAccountById({account_id});
            const user = userDetails[0]
            req.user = user;
            next()
        }catch(error){
            next(error)
        }
    }

    //authorization 

    static authorization(roles, actions, resourceType) {
        return async (req, res, next) => {
            try {

            const user = req.user; 
            const userRole = user?.role;

            // const permission = {
            //     user: ['read:any'],
            //     agent: ['read:any', 'create:own', 'update:own', 'delete:own', 'block:own'],
            //     admin: ['read:any', 'read:admin-only','create:own', 'update:own', 'delete:any', 'block:any'],
            // };

            const allowedRoles = Array.isArray(roles) ? roles : [roles];
            const actionList = Array.isArray(actions) ? actions : [actions];

            if (!allowedRoles.includes(userRole)) {
                throw new CustomError({
                message: 'Forbidden, role not permitted.',
                statusCode: 403,
                details: {},
                });
            }

            const userPermissions = permission[userRole] || [];
            const matchedAction = actionList.find((action) => userPermissions.includes(action));

            if(!matchedAction) {
                throw new CustomError({
                message: 'You are not permitted to perform this action.',
                statusCode: 403,
                details: {},
                });
            }

            // Ownership check only if the action ends in ':own'
            if(matchedAction.endsWith(':own') && matchedAction !== 'create:own'){
                const resourceId = req.params.id || req.body.id;
                if (!resourceId) {
                throw new CustomError({
                    message: 'Missing resource ID',
                    statusCode: 400,
                    details: {},
                });
                }

                const ownerId = await AuthHelperModel.getResourceOwner(resourceType, resourceId);
                if(!ownerId){
                throw new CustomError({
                    message: 'Resource or property not found.',
                    statusCode: 404,
                    details: {},
                });
                }
                if(ownerId !== user.account_id){
                throw new CustomError({
                    message: 'You cannot perform this operation.',
                    statusCode: 403,
                    details: {},
                });
                }
            }
            next();
            } catch (error) {
            next(error);
            }
        };
    }

}

module.exports = Auth