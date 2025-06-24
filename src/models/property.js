const PG_DB = require('../database/rdbms/postgres');


class DB_Property_Model{
    static async propertyExist({property_id}){
        try{
            const result = await PG_DB.query(
                `SELECT 1 FROM property WHERE property_id = $1 LIMIT 1`,
                [property_id]
            );
             if(result.length < 1) {
                return false;
            }
            return true;
        }catch(err){
            // console.error(err)
            throw err
        }
    }
    static async getAllProperty({limit,ofset}){
        try{
            const result = await PG_DB.query(
                `SELECT property_id, property_features,COALESCE(image[1],'') AS image,title,category,country,state,price,available_for
                FROM property
                ORDER BY id DESC
                LIMIT $1 OFFSET $2;`,[limit,ofset]);
            const countResult = await  PG_DB.query(
                `SELECT COUNT(*) AS total FROM property`
              );
            const total = countResult[0]?.total || 0;

             if(result.length > 0){
                return {result,total};
            }
            return false
        }catch(error){
            throw error
        }
    }
    static async getPropertyById({property_id}){
        try{
            const result = await PG_DB.query(
                `SELECT p.*, a.firstname, a.lastname
                FROM property p
                LEFT JOIN accounts a
                ON p.account_id = a.account_id
                WHERE p.property_id = $1;`,[property_id]);

            if(result.length > 0){
            return result;
            }
            return false
        }catch(error){
        throw error
        }
    }

   static async uploadProperty(resource){
        try{
            const fields = [
            "title", "address", "country", "state", "description",
            "available_for", "category", "price", "property_features", "status",
            "account_id", "property_id", "image","created_at"
            ];

            const placeholders = fields.map((_, i) => `$${i + 1}`).join(',');
            const values = fields.map(field => resource[field]);

            const result = await PG_DB.query(
                `INSERT INTO property (${fields.join(',')}) VALUES (${placeholders}) RETURNING *`,
                values
            );
            return result[0]
        }catch(error){
            throw error
        }
    }
    static async updateProperty({ property_id, updates }){
        try{
            // console.log('updates:', updates);
            const queryParams = [];
            const setClauses = [];

            Object.keys(updates).forEach((key) => {
                //check if image is to be added
            if(key === 'image') {
                setClauses.push(`"${key}" = array_cat("${key}", $${queryParams.length + 1})`);
                queryParams.push(updates[key]);
            } else {
                setClauses.push(`"${key}" = $${queryParams.length + 1}`);
                queryParams.push(updates[key]);
            }
            });

            queryParams.push(property_id);

            const setClause = setClauses.join(', ');
            const query = `
            UPDATE property
            SET ${setClause}
            WHERE property_id = $${queryParams.length}
            RETURNING *;
            `;

            const result = await PG_DB.query(query, queryParams);
            return result;

        }catch(error){
            throw error
        }
    }

    static async removeImageFromAPropertyImages({property_id, filename}){
        try{
            const result = await PG_DB.query(`
            UPDATE property
            SET image = array_remove(image, $2)
            WHERE property_id = $1
            RETURNING image;`,
            [property_id,filename]);
            if(result.length>0){
                return result[0];
            }
            return false;
        }catch(error){
            throw error
        }
    }

    static async DeletePropertyById({property_id}){
        try{
            const result = await PG_DB.query(
            `DELETE FROM property
            WHERE property_id = $1
            RETURNING *;`,
            [property_id])
        if (result.length>0){
            return result
        }
        return false
        }catch(error){
            throw error
        }
    }
    static async searchProperties(filters) {
        try{
            const {title,country,state,address,status,category,available_for,
            min_price,max_price,property_features,
            limit = 6,
            offset = 0,
        } = filters;

        const conditions = [];
        const values = [];
        let idx = 1;

        const likeFields = { title, country, state, address, status, category, available_for };

        for (const [field, value] of Object.entries(likeFields)) {
            if (value) {
            conditions.push(`${field} ILIKE $${idx}`);
            values.push(`%${value}%`);
            idx++;
            }
        }

        if (min_price) {
            conditions.push(`price >= $${idx}`);
            values.push(min_price);
            idx++;
        }

        if (max_price) {
            conditions.push(`price <= $${idx}`);
            values.push(max_price);
            idx++;
        }

        // JSONB filtering
        if (property_features && typeof property_features === 'object') {
            for (const [key, value] of Object.entries(property_features)) {
            if (value) {
                conditions.push(`property_features ->> '${key}' ILIKE $${idx}`);
                values.push(`%${value}%`);
                idx++;
            }
            }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const mainQuery = `
            SELECT property_id, property_features, COALESCE(image[1], '') AS image,
                title, category, country, state, price, available_for
            FROM property
            ${whereClause}
            ORDER BY id DESC
            LIMIT $${idx} OFFSET $${idx + 1}
        `;

        values.push(limit);
        values.push(offset);

        const result = await PG_DB.query(mainQuery, values);

        // Get total count (without limit/offset)
        const countQuery = `SELECT COUNT(*) AS total FROM property ${whereClause}`;
        const countValues = values.slice(0, idx - 1); // exclude limit/offset
        const countResult = await PG_DB.query(countQuery, countValues);

        if (result.length>0){
            return {
            result,
            total: parseInt(countResult[0]?.total || 0),
        };
        }
        return false
        }catch(error){
            throw error
        }    
    }

}

module.exports = DB_Property_Model;

