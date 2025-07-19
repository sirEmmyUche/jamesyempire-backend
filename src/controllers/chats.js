const DB_Chats_Model = require('../models/chats')
const {CustomError} = require('../libraries/custom_error')
const Utilities = require('../utils/utilities')

class Chats {
    static async getMyChatRequest(req, res, next){
        try{
            const baseUrl = `${process.env.IMGBASEURL}`;
            const profilePicUrl =  `${process.env.PROFILE_PIC_BASEURL}`
            const user = req.user;
            const account_id = user.account_id
            const result = await DB_Chats_Model.getMyChatRequest({account_id});
            if(!result){
                throw new CustomError({
                    message: 'No chat request',
                    statusCode: 404,
                    details: {}
                })
            } 
            
            const chatlist = await Promise.all(result.map(async (item) => {
            return {
                ...item,
                image: `${baseUrl}/${item.image}`,
                agent_profile_img:item.agent_profile_img !== ''?`${profilePicUrl}/${item.agent_profile_img}`:item.agent_profile_img,
                user_profile_img:item.user_profile_img !== ''?`${profilePicUrl}/${item.user_profile_img}`:item.user_profile_img,
                // Await the asynchronous encrypt function
                chatroom_id: await Utilities.encrypt(item.chatroom_id) // Added .toString() as well
            };
            }));
            res.status(200).json({
                success:true,
                message:'chatlist fetched successfully',
                chatlist
            })
        }catch(error){
            next(error)
        }
    }
    static async getChatById(req,res,next){
        try{
             const baseUrl = `${process.env.IMGBASEURL}`;
            const profilePicUrl =  `${process.env.PROFILE_PIC_BASEURL}`
            const chatroom_id = req.query.chatroomId;
            // console.log(chatroom_id)
            if(!chatroom_id){
                throw new CustomError({
                     message: 'Missing chatroom ID',
                    statusCode: 404,
                    details: {}
                })
            }
            const decryptChatroomId = await Utilities.decrypt(chatroom_id);

            if(!decryptChatroomId){
                throw new CustomError({
                     message: 'Invalid chatroom',
                    statusCode: 404,
                    details: {}
                })
            }
            const isChatRoomExist = await DB_Chats_Model.isChatroomExist(decryptChatroomId);

            if(!isChatRoomExist){
                 throw new CustomError({
                     message: 'Unable to find chat',
                    statusCode: 404,
                    details: {}
                })
            }

            const getChatMessages = await Utilities.getCachedChats(decryptChatroomId);

            let messages;

            getChatMessages? messages = getChatMessages : [];

            const result = await DB_Chats_Model.getChatById(decryptChatroomId);

            const chat = await Promise.all(result.map(async (item) => {
            return {
                messages,
                ...item,
                image: `${baseUrl}/${item.image}`,
                agent_profile_img:item.agent_profile_img !== ''?`${profilePicUrl}/${item.agent_profile_img}`:item.agent_profile_img,
                user_profile_img:item.user_profile_img !== ''?`${profilePicUrl}/${item.user_profile_img}`:item.user_profile_img,
                // Await the asynchronous encrypt function
                chatroom_id: await Utilities.encrypt(item.chatroom_id) // Added .toString() as well
            };
            }));

            res.status(200).json({
                success:true,
                message:'Chat successfully fetched',
                chat
            })

        }catch(error){
            next(error)
        }
    }
}

module.exports = Chats