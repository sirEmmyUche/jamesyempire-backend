const PG_DB = require('../database/rdbms/postgres');

class DB_Chats_Model{
    static async isChatroomExist(chatroom_id){
        try{
            const result = await PG_DB.query(
                'SELECT 1 from chat_room WHERE chatroom_id = $1 LIMIT 1',[chatroom_id]
            );
            // console.log(result)
            if(result.length > 0){
                return true;
            }
            return false
        }catch(error){
            throw error
        }
    }

    static async createChatroom({chatroom_id,property_id, user_id,agent_id,created_at = new Date(),status = 'inactive'}){
        try{
            const result = await PG_DB.query(
                `INSERT INTO chat_room(chatroom_id,property_id, user_id, agent_id, created_at, status)
                VALUES($1, $2, $3, $4, $5, $6)
                RETURNING *`,
                [chatroom_id,property_id, user_id,agent_id,created_at,status]
            )
             if (!result || result.length === 0) {
            throw new Error('Chatroom creation failed');
            }
            return result[0];
        }catch(error){
            console.error(error)
            throw error
        }
    }

    static async getMyChatRequest({account_id}){
        try{
             const result = await PG_DB.query(
                `SELECT cr.*, 
                u.firstname AS user_firstname, u.profile_img AS user_profile_img,
                a.firstname AS agent_firstname, a.profile_img AS agent_profile_img,
                p.title, COALESCE(p.image[1],'') AS image, p.price
                FROM chat_room cr
                JOIN 
                property p ON cr.property_id = p.property_id
                JOIN
                accounts u ON cr.user_id = u.account_id
                JOIN
                accounts a ON cr.agent_id = a.account_id
                WHERE 
                cr.agent_id = $1;`,[account_id]);

            if(result.length > 0){
            return result;
            }
            return false
        }catch(error){
            throw error
        }
    }
    static async getChatById(chatroomId){
        try{
            const result = await PG_DB.query(
                `SELECT cr.*, 
                u.firstname AS user_firstname, u.profile_img AS user_profile_img,
                a.firstname AS agent_firstname, a.profile_img AS agent_profile_img,
                p.title, COALESCE(p.image[1],'') AS image, p.price
                FROM chat_room cr
                JOIN 
                property p ON cr.property_id = p.property_id
                JOIN
                accounts u ON cr.user_id = u.account_id
                JOIN
                accounts a ON cr.agent_id = a.account_id
                WHERE 
                cr.chatroom_id = $1;`,[chatroomId]);

            if(result.length > 0){
            return result;
            }
            return false
        }catch(error){
            throw error
        }
    }
}

module.exports = DB_Chats_Model