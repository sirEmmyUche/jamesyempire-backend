require('dotenv').config();
const crypto = require('crypto');
const jwt = require('jsonwebtoken')
// const fs = require('fs/promises');

const algorithm = 'aes-256-cbc';
const secretKey = `${process.env.CRYPTO_SECRETE_KEY}`;
const iv = crypto.randomBytes(16);


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
      return `Chat:${property_id}:${user_id}:${agent_id}`;
    }
}

module.exports = Utilities;