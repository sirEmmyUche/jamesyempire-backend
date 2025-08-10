require('dotenv').config();
const crypto = require('crypto');
const jwt = require('jsonwebtoken')
const NodeCache = require('node-cache')
// const fs = require('fs/promises');
const {isValidPhoneNumber} = require('libphonenumber-js')

const algorithm = 'aes-256-cbc';
const secretKey = `${process.env.CRYPTO_SECRETE_KEY}`;
const iv = crypto.randomBytes(16);

const cache = new NodeCache({})


class Utilities {
    static async encrypt(plainText){
      const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    }

    static async decrypt(isEncrypted){
      const parts = isEncrypted.split(':');
      const iv = Buffer.from(parts.shift(), 'hex');
      const encryptedText = Buffer.from(parts.join(':'), 'hex');
      const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    };

    static async generateJwtToken({payload}){
      const secreteKey = process.env.JWT_SECRETE_KEY;
      const token = jwt.sign(payload, secreteKey,);
      return token
    }

    static generateChatRoomId({ property_id, user_id, agent_id }){
      return `${property_id}:${user_id}:${agent_id}`;
    }


    static capitalizeName(text){
      return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
    }

    static validatePhoneNumber(phone){
      const isValid = isValidPhoneNumber(phone)
      if (isValid) return true;
      return false;
    }

    static async setChatMessage(uniqueKey, newValue){
      try{
        const iskeyExist = cache.has(`${uniqueKey}`);
      if(iskeyExist){
          // console.log('iskeyExist-setchat-message:',iskeyExist)
        // Try getting the TTL left
          const ttlRemaining = cache.getTtl(uniqueKey);
          const now = Date.now();
          let remainingSeconds = ttlRemaining ? Math.floor((ttlRemaining - now) / 1000) : 3000//432000;

          let currentValue = cache.get(uniqueKey);
          // console.log('current-value:',currentValue)

          if (Array.isArray(currentValue)) {
            currentValue.push(newValue);
            const updated = cache.set(uniqueKey, currentValue, remainingSeconds);
             return updated? true : false
          } else if (currentValue !== undefined) {
            const updated = cache.set(uniqueKey, [currentValue, newValue], remainingSeconds);
             return updated? true : false
          } 
 
        // console.log('cache set message:', getChat)
      }
      else {
           const updated = cache.set(uniqueKey, [newValue], 3000); // 432000 -5days First-time insert
            return updated? true : false
        }
      }catch(error){
        throw error
      }
    }

    static async getCachedChats(uniqueKey){
      try{
         const iskeyExist = cache.has(`${uniqueKey}`)
         if(!iskeyExist) return false;

         const getChatMessages = cache.get(`${uniqueKey}`)

         return getChatMessages;
         
      }catch(error){
        throw error
      }
    }
}

module.exports = Utilities;