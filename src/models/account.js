const PG_DB = require('../database/rdbms/postgres');

 class DB_Account_Model {
    static async getColumnNames({ tableName }) {
        try{
            const result = await PG_DB.query(
                `SELECT array_agg(column_name::text) 
                FROM information_schema.columns
                WHERE table_name = $1
                `, [tableName]);

                if (result && result[0] && result[0].array_agg) {
                return result[0].array_agg;
                }
                return [];
            } catch (error) {
                throw error;
            }
    }

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

    static async phoneNumberExist({phone}){
        try{
            const result = await PG_DB.query(
                'SELECT 1 from accounts WHERE phone = $1 LIMIT 1',[phone]
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

    static async getPhoneNumberByAccountId({account_id}){
        try{
            const result = await PG_DB.query(
                'SELECT phone from accounts WHERE account_id = $1 LIMIT 1',[account_id]
            );
            // console.log(result)
            if(result.length > 0){
                return result[0];
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

    static async checkImageExistsInDB(account_id, public_id) {
        try {
        const query = `
            SELECT 1
            FROM accounts
            WHERE account_id = $1 AND profile_img = $2 LIMIT 1;
        `;
        const result = await PG_DB.query(query, [account_id, public_id]);
        if(result.length < 1) {
                return false;
            }
            return true;
        } catch (error) {
        throw new Error(`Failed to check image existence in database: ${error.message}`);
        }
    }

    static async removeProfilePics(account_id){
        try{
            const query = `
            UPDATE accounts
            SET profile_img = NULL,
            profile_img_metadata = '{}'
            WHERE account_id = $1;
            `
            const result = await PG_DB.query(query, [account_id,]);
            // console.log(result)
            if(result.length>0){
                return result
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
                `SELECT a.account_id, a.email, a.firstname, a.lastname, a.phone, a.role,
                  COALESCE(a.profile_img, '') AS profile_img_public_id,
                a.profile_img_metadata,
                lc.hash_email,lc.password
                FROM accounts a
                INNER JOIN login_credentials lc 
                ON a.account_id = lc.account_id
                WHERE a.email = $1;`,[email]
            );
            // console.log(result)
            if(result.length > 0){
                return result[0];
            }
            return false
        }catch(error){
            throw error
        }
    }


   static async createAccount({hashPassword, email, encryptedEmail, firstname,
     role, lastname, account_id, phone, created_at }) {
        try {
            const result = await PG_DB.transaction(
            () => ({
                query: `
                INSERT INTO accounts(account_id, firstname, lastname, email, phone, created_at, role, profile_img, profile_img_metadata)
                VALUES($1, $2, $3, $4, $5, $6, $7, NULL, '{}')
                RETURNING account_id
                `,
                values: [account_id, firstname, lastname, email, phone, created_at, role]
            }),
            (prev) => ({
                query: `
                INSERT INTO login_credentials(account_id, hash_email, password)
                VALUES ($1, $2, $3)
                RETURNING account_id
                `,
                values: [prev[0].account_id, encryptedEmail, hashPassword]
            }),
            (prev) => ({
                query: `
                INSERT INTO account_verification_status(account_id, email, phone)
                VALUES ($1, $2, $3)
                RETURNING account_id
                `,
                values: [prev[0].account_id, false, false]
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

    static async updateAccount({ account_id, updates, profileImage }) {
      try{
        const result = await PG_DB.transaction(
            // Step 1: Update account
            ()=>{
                const filteredUpdates = Object.fromEntries(
                Object.entries(updates).filter(([key]) => key !== 'updated_at')
                );

                const queryParams = [];
                const setClauses = [];

                Object.keys(filteredUpdates).forEach((key, index) => {
                setClauses.push(`"${key}" = $${index + 1}`);
                queryParams.push(filteredUpdates[key]);
                });

                if (profileImage) {
                const { public_id, metadata } = profileImage;
                setClauses.push(`profile_img = $${queryParams.length + 1}`);
                setClauses.push(`profile_img_metadata = $${queryParams.length + 2}`);
                queryParams.push(public_id, metadata);
                }

                setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

                return {
                query: `
                    UPDATE accounts
                    SET ${setClauses.join(', ')}
                    WHERE account_id = $${queryParams.length + 1}
                    RETURNING account_id, email, firstname, lastname, phone, role, profile_img, profile_img_metadata;
                `,
                values: [...queryParams, account_id],
                };
            },

            // Step 2: Reset verification flags if needed
            (prev) => {
                if (!prev?.length) {
                return null; // no update happened
                }

                const current = prev[0];
                const resetFields = {};
                const values = [];

                if (updates.phone !== undefined && updates.phone !== current.phone) {
                resetFields.phone = false;
                }
                if (updates.email !== undefined && updates.email !== current.email) {
                resetFields.email = false;
                }

                if (Object.keys(resetFields).length > 0) {
                const setClauses = [];
                let idx = 1;
                for (const [field, val] of Object.entries(resetFields)) {
                    setClauses.push(`${field} = $${idx++}`);
                    values.push(val);
                }
                values.push(account_id);

                return {
                    query: `
                    UPDATE account_verification_status
                    SET ${setClauses.join(', ')}
                    WHERE account_id = $${values.length}
                    RETURNING account_id;
                    `,
                    values,
                };
                }

                return null; // no second update needed
            }
        );

        if (!result) {
        return false;
        }

        // Flatten but ignore null rows
        const updatedAccount = result
        .flat()
        .filter(Boolean) // remove null
        .reduce((acc, row) => ({ ...acc, ...row }), {});

        return {...updatedAccount };
        } catch (error) {
            throw error;
        }
 }


}
 module.exports = DB_Account_Model