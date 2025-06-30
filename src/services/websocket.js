require('dotenv').config();
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const DB_Account_Model = require('../models/account')
const Auth = require('../middlewares/auth')
const Utilities = require('../utils/utilities')
class WebSocketService {
    constructor(server) {
        this.io = socketIo(server, {
            path: '/v1/ws',
            cors: {
                origin: 'http://localhost:5173',
                // origin: ['http://127.0.0.1:5173'],
                methods: ['GET', 'POST'],
                allowedHeaders: ['Authorization', 'Content-Type','Access-Control-Allow-Origin'],
                credentials: true
            }
        });

        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                // const user = await Auth.verifySocketToken(socket);
                // socket.user = user; // full user object
                next();
            } catch (error) {
                console.error("Socket i.o authenticating error:",error)
                next(new Error(error)); 
            }
        });

        this.io.on('connect', this.handleConnection.bind(this));
    }

    handleConnection(socket) {
        console.log(`Client connected: ${socket.id}`);
        socket.join('default-room')

        socket.on('join-room', () => {
            socket.join('default-room');
            console.log(`${socket.id} joined default-room`);
            socket.emit('joined-room', 'default-room');
        });

        socket.on('join-chat-room', async ({ property_id, agent_id }) => {
            try {
                const user = socket.user;
                const user_id = user.account_id;

                // Validate property_id and agent_id
                if (!property_id || !agent_id) {
                    return socket.emit('error', { message: 'Missing property_id or agent_id' });
                }

                const chatRoomId = Utilities.generateChatRoomId({ property_id, user_id, agent_id });

                // Role-based access control
                // if (
                //     user.account_id !== agent_id && // not the agent
                //     user.role !== 'admin' 
                //     //&& 
                //     // user.role !== 'moderator'
                // ) {
                //     const isUserAllowed = await DB_Account_Model.isUserInterestedInProperty({ property_id, user_id });
                //     if (!isUserAllowed) {
                //         return socket.emit('error', { message: 'You are not permitted to join this chat' });
                //     }
                // }

                socket.join(chatRoomId);
                console.log(`${user.account_id} joined room: ${chatRoomId}`);
                socket.emit('joined-chat', { room_id: chatRoomId });
            } catch (err) {
                console.error("Join chat error:", err.message);
                socket.emit('error', { message: 'Error joining chat' });
            };
        });

        //next event
        socket.on('chat-message', async ({ room_id, content, message }) => {
            try{
                console.log('received message:',message)
                // const user = socket.user;

                // if (!room_id || !content) {
                //     return socket.emit('error', { message: 'Missing room_id or message content' });
                // }

                // const messagePayload = {
                //     sender: {
                //         id: user.account_id,
                //         username: user.username,
                //         role: user.role,
                //     },
                //     content,
                //     timestamp: new Date(),
                // };
                // // (Optional) Save message to DB or Redis

            // this.io.to(room_id).emit('chat-message', messagePayload);//send message to the appropriate room
                this.io.to('default-room').emit('chat-message', {message});
            }catch(error){
                console.error('Sending message error:',error)
                socket.emit('error', { message: 'Error sending message' });
            }
        });

        // next event
        socket.on('leave-chat', (room_id) => {
            try{
                if (!room_id) return;

                socket.leave(room_id);
            }catch(error){
                console.error('Leave-chat-error:',error)
            }
        })

         socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });

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