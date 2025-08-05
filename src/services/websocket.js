require('dotenv').config();
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const DB_Account_Model = require('../models/account');
const DB_Property_Model = require('../models/property')
const DB_Chats_Model = require('../models/chats')
const Auth = require('../middlewares/auth')
const Utilities = require('../utils/utilities');
const Helpers = require('../helpers/helpers');


class WebSocketService {
    constructor(server) {
        this.io = socketIo(server, {
            path: '/v1/ws',
            cors: {
                origin: ['http://localhost:5173',
                    'https://jamesyempire-frontend.vercel.app',
                    'https://www.jamesyempire.com'
                ],
                // origin: ['http://127.0.0.1:5173'],
                methods: ['GET', 'POST'],
                allowedHeaders: ['Authorization', 'Content-Type','Access-Control-Allow-Origin'],
                credentials: true
            }
        });

        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                const user = await Auth.verifySocketToken(socket);
                socket.user = user; // full user object
                //  console.log('socket-user:', socket.user)
                next();
            } catch (error) {
                console.error("Socket i.o authenticating error:",error)
                next(new Error(error)); 
            }
        });

        this.io.on('connect', this.handleConnection.bind(this));
    }

    handleConnection(socket) {
        // console.log(`Client connected: ${socket.id}`);

        socket.on('connect', async()=>{
            return socket.emit('connect', { message: 'Connected to socket' });
        })

        socket.on('disconnecting', async ()=>{
            if(socket.chatroom_id){
                const user = socket.user;
                const userFirstName = user.firstname;
                const encryptChatRoomId = await Utilities.encrypt(socket.chatroom_id)

                const userLeftPayload = {
                    message:`${userFirstName} left`,
                    timestamp: new Date(),
                    room_id: encryptChatRoomId,
                }
                 this.io.to(`${socket.chatroom_id}`).emit('user-left',{userLeftPayload});
            }
        })

        // socket.on('disconnect', async() => {
        //     console.log(`Client disconnected: ${socket.id}`);
        // });

        socket.on('create-chat-room', async ({ property_id, agent_id }) => {
            try {
                const user = socket.user;
                const user_id = user.account_id;
                // console.log('user-joined-chat:', user)

                // Validate property_id and agent_id
                if (!property_id || !agent_id) {
                    // console.log('property_id:',property_id)
                    return socket.emit('error', { message: 'Missing property or agent' });
                }

                if(user_id == agent_id){
                     return socket.emit('error', { message: 'You own this property' });
                }

                //check if both property and agent_id exist
                const account_id = agent_id;
                if(!await DB_Property_Model.propertyExist({property_id})
                    && !await DB_Account_Model.accountExist({account_id})
                ){
                    return socket.emit('error', { message: 'Property or agent account not found' });
                }


                const chatroom_id = Utilities.generateChatRoomId({ property_id, user_id, agent_id });
                const status = 'active'
                const created_at = new Date();

                if(!await DB_Chats_Model.isChatroomExist(chatroom_id)){
                    const saveChatroomDetails = await DB_Chats_Model.createChatroom({
                    property_id, user_id, agent_id,status,created_at,chatroom_id
               })

                    if(!saveChatroomDetails){
                        return socket.emit('error', { message: 'Unable to create chatroom at the moment.' })
                    }

                }

                const encryptChatRoomId = await Utilities.encrypt(chatroom_id)
              
                socket.join(chatroom_id);
                socket.chatroom_id = chatroom_id;
                // console.log(`${user.account_id} joined room: ${chatRoomId}`);
                const joinedMsgPayLoad = {
                    message:'You joined the chat',
                    timestamp: new Date(),
                    room_id: encryptChatRoomId,
                }

                // console.log('Emitting you-joined to:', socket.id, joinedMsgPayLoad);
                 this.io.to(`${chatroom_id}`).emit('you-joined',{joinedMsgPayLoad});
                
                 const getAgentAccountInfo = await DB_Account_Model.getAccountById({account_id});
                 const agentEmail =  getAgentAccountInfo[0]?.email
                 const agentName = `${getAgentAccountInfo[0]?.firstname.charAt(0).toUpperCase()}${getAgentAccountInfo[0]?.firstname.slice(1)}`;
                 const notifyAgent = await Helpers.sendEmailNotficationForChatRequest(agentEmail, agentName);
            
                 const waitingForAgent = {
                    message:'Waiting for agent...',
                    room_id: encryptChatRoomId,
                }
                this.io.to(`${chatroom_id}`).emit('waiting-for-agent',{waitingForAgent});

                 if(!notifyAgent){
                     socket.emit('error', { message: 'Unable to notify agent.'});

                     let agentNotifyStatusPayload = {
                        room_id: encryptChatRoomId,
                        message:'Unable to notify agent. Please try again later.',
                        timestamp: new Date(),
                     }

                     this.io.to(`${chatroom_id}`).emit('agent-notification-status',{agentNotifyStatusPayload});
                 }

            } catch (err) {
                console.error("create chatroom error:", err.message);
                socket.emit('error', { message: 'Error joining chat' });
            };
        });

        //next event
        socket.on('request-to-join-chat-room', async({chatroom_id})=>{
            try{
                const user = socket.user;
                const user_id = user.account_id;
                if(!chatroom_id){
                     return socket.emit('error', { message: 'Missing chatroom_id.'})
                };
                const decryptChatroomId = await Utilities.decrypt(chatroom_id);
                const isChatRoomExist = await DB_Chats_Model.isChatroomExist(decryptChatroomId);
                if(!isChatRoomExist){
                    return socket.emit('error', { message: 'Chatroom not found.'});
                }
                const [chatroomPropertyId, chatroomUserId, chatroomAgentId] = decryptChatroomId.split(':');

                if(user.role === 'user' && user_id != chatroomUserId){
                    return socket.emit('error', { message: 'You are not authorised to join this chat.'});
                }

                if(user.role == 'agent'&& user_id !=chatroomAgentId ){
                     return socket.emit('error', { message: 'You are not authorised to join this chat.'});
                }
                socket.join(decryptChatroomId);
                socket.chatroom_id = decryptChatroomId;

                const userJoinedPayload = {
                      room_id: chatroom_id,
                     user_id:user.account_id,
                    username:`${user.firstname} ${user.lastname}`,
                    message: `${user.firstname} joined the chat.`,
                    property_id:chatroomPropertyId,
                    timestamp: new Date(),
                }

                this.io.to(`${decryptChatroomId}`).emit('user-joined',{userJoinedPayload})
            }catch(err){
                console.error("join chatroom error:", err.message);
                socket.emit('error', { message: 'Error joining chatroom' });
            }
        })

        //next event
        socket.on('chat-message', async ({messagePayLoad}) => {
            try{
                // console.log('received message:',messagePayLoad)
                const user = socket.user;
                const getRoom_id = messagePayLoad?.room_id;

                if(!getRoom_id){
                     return socket.emit('error', { message: 'Missing chatroom Id.'});
                }

                const room_id = await Utilities.decrypt(getRoom_id)

                const payload = {
                    sender: {
                        user_id: user.account_id,
                        username:`${user.firstname} ${user.lastname}`,
                        // profile_pic: user.profile_img,
                        role: user.role,
                    },
                    message:messagePayLoad.message,
                    timestamp: new Date(),
                };
                // // (Optional) Save message to DB or Redis
                 const saveChatToCache = await Utilities.setChatMessage( room_id,payload) 

                //  console.log('websocket-save-to-chat:',saveChatToCache)

            // this.io.to(room_id).emit('chat-message', messagePayload);//send message to the appropriate room
                this.io.to(`${room_id}`).emit('chat-message', {payload});
            }catch(error){
                console.error('Sending message error:',error)
                socket.emit('error', { message: 'Error sending message' });
            }
        });

        // next event
        // socket.on('leave-chat', (room_id) => {
        //     try{
        //         if (!room_id) return;

        //         socket.leave(room_id);
        //     }catch(error){
        //         console.error('Leave-chat-error:',error)
        //     }
        // })

    }

        // Method to broadcast chat messages
        broadcastMessage(chatroomId, message) {
        this.io.to(`chat:${chatroomId}`).emit('chat-message', message);
    }
}

// Create singleton instance
let instance = null;

module.exports = {
    initialize: (server) => {
        instance = new WebSocketService(server);
        console.log("Initialized web socket server with details")
        return instance;
    },
    getInstance: () => instance
};