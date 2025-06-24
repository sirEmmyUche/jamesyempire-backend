const PG_DB = require('../database/rdbms/postgres');

 class DB_Account_Model {
    static async emailAddressExist({email}){
        try{
            const result = await PG_DB.query(
                'SELECT 1 from accounts WHERE LOWER(email) = LOWER($1) LIMIT 1',[email]
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

    static async accountExist({account_id}){
        try{
            const result = await PG_DB.query(
                'SELECT 1 from accounts WHERE account_id = $1 LIMIT 1',[account_id]
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

    static async getAccountByEmail({email}){
        try{
            const result = await PG_DB.query(
                'SELECT * from accounts WHERE LOWER(email) = LOWER($1) LIMIT 1',[email]
            );
            // console.log(result)
            if(result.length > 0){
                return result;
            }
            return false
        }catch(error){
            throw error
        }
    }

    static async getAccountById({account_id}){
        try{
            const result = await PG_DB.query(
                'SELECT * from accounts WHERE account_id = $1 LIMIT 1',[account_id]
            );
            // console.log(result)
            if(result.length > 0){
                return result;
            }
            return false
        }catch(error){
            throw error
        }
    }

    static async getAccountLoginCredentialsByEmail({email}){
        try{
            const result = await PG_DB.query(
                `SELECT a.account_id, a.email, a.firstname, a.lastname, a.phone, a.role, lc.hash_email,lc.password
                FROM accounts a
                INNER JOIN login_credentials lc 
                ON a.account_id = lc.account_id
                WHERE a.email = $1;`,[email]
            );
            // console.log(result)
            if(result.length > 0){
                return result;
            }
            return false
        }catch(error){
            throw error
        }
    }


   static async createAccount({hashPassword, email, encryptedEmail, firstName,
     role, lastName, account_id, phone, created_at }) {
        try {
            const result = await PG_DB.transaction(
            () => ({
                query: `
                INSERT INTO accounts(account_id, firstname, lastname, email, phone, created_at, role)
                VALUES($1, $2, $3, $4, $5, $6, $7)
                RETURNING account_id
                `,
                values: [account_id, firstName, lastName, email, phone, created_at, role]
            }),
            (prev) => ({
                query: `
                INSERT INTO login_credentials(account_id, hash_email, password)
                VALUES ($1, $2, $3)
                RETURNING account_id
                `,
                values: [prev[0].account_id, encryptedEmail, hashPassword]
            })
            );

            if (!result || result.length === 0) {
            throw new Error('Account creation failed');
            }
            return result[0];
        }catch (error) {
            throw error;
        }
    }

 }
 module.exports = DB_Account_Model