const PG_DB = require('../database/rdbms/postgres');
const {CustomError} = require('../libraries/custom_error')


class DB_Property_Model{

   static async adsResponseExist({id}){
        try{
            const result = await PG_DB.query(
                `SELECT 1 FROM ads_response WHERE ads_response_id = $1 LIMIT 1`,
                [id]
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

  static async getAllAdsResponse({limit, offset}){
    try{
      const result = await PG_DB.query(
        `SELECT * FROM ads_response
         ORDER BY id DESC
        LIMIT $1 OFFSET $2;`,
        [limit, offset]
      )
      const countResult = await PG_DB.query(`SELECT COUNT(*) AS total FROM ads_response`);
      const total = parseInt(countResult[0]?.total) || 0;

      if (result.length > 0) {
        return { result, total };
      }
      return { result: [], total: 0 };
    }catch(error){
      throw error
    }
  }

    static async SaveAdsResponse({data}){
        try{
            const result = await PG_DB.query(
                `INSERT INTO ads_response (ads_response_id, phone, email, message, location,created_at,name)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *;`,
                [data.ads_response_id, data.phone, data.email, data.message, data.location, data.created_at, data.name]
            );
            if (result.length > 0) {
                return result[0];
            }
            return false;
        }catch(error){
          console.error(error);
            throw new CustomError({
              message:'Unable to process your request at the moment.',
              statusCode: 500,
              details:{}
            })
        }
    }

     static async deleteAdsResponseById(ads_response_id){
        try{
            const result = await PG_DB.query(
            `DELETE FROM ads_response
            WHERE ads_response_id = $1
            RETURNING *;`,
            [ads_response_id])
        if (result.length>0){
            return result
        }
        return false
        }catch(error){
            throw error
        }
    }

    static async getMyProperties({ account_id, limit, offset }) {
    try {
      const query = `
        SELECT 
          p.id,
          p.property_id,
          p.property_features,
          p.title,
          p.category,
          p.country,
          p.state,
          p.price,
          p.available_for,
          COALESCE(
            json_build_object(
              'public_id', pi.public_id,
              'secure_url', pi.metadata->>'secure_url',
              'display_order', pi.display_order
            ),
            '{}'
          ) AS image
        FROM property p
        LEFT JOIN (
          SELECT DISTINCT ON (property_id) property_id, public_id, metadata, display_order
          FROM property_images
          ORDER BY property_id, display_order ASC
        ) pi ON p.property_id = pi.property_id
        WHERE p.account_id = $1
        ORDER BY p.id DESC
        LIMIT $2 OFFSET $3;
      `;
      const result = await PG_DB.query(query, [account_id, limit, offset]);

      const countQuery = `SELECT COUNT(*) AS total FROM property WHERE account_id = $1`;
      const countResult = await PG_DB.query(countQuery, [account_id]);
      const total = parseInt(countResult[0]?.total) || 0;

      if (result.length > 0) {
        return { result, total };
      }
      return { result: [], total: 0 };
    } catch (error) {
      throw new Error(`Failed to fetch properties: ${error.message}`);
    }
  }

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

  static async getAllProperty({ limit, offset }) {
    try {
      const query = `
        SELECT 
          p.id,
          p.property_id,
          p.property_features,
          p.title,
          p.category,
          p.country,
          p.state,
          p.price,
          p.available_for,
          COALESCE(
            json_build_object(
              'public_id', pi.public_id,
              'secure_url', pi.metadata->>'secure_url',
              'display_order', pi.display_order
            ),
            '{}'
          ) AS image
        FROM property p
        LEFT JOIN (
          SELECT DISTINCT ON (property_id) property_id, public_id, metadata, display_order
          FROM property_images
          ORDER BY property_id, display_order ASC
        ) pi ON p.property_id = pi.property_id
        ORDER BY p.id DESC
        LIMIT $1 OFFSET $2;
      `;
      const result = await PG_DB.query(query, [limit, offset]);

      const countResult = await PG_DB.query(`SELECT COUNT(*) AS total FROM property`);
      const total = parseInt(countResult[0]?.total) || 0;

      if (result.length > 0) {
        return { result, total };
      }
      return { result: [], total: 0 };
    } catch (error) {
      throw new Error(`Failed to fetch properties: ${error.message}`);
    }
  }


  static async getPropertyById({ property_id }) {
    try {
      const query = `
        SELECT 
          p.id,
          p.property_id,
          p.property_features,
          p.title,
          p.category,
          p.country,
          p.state,
          p.price,
          p.available_for,
          p.description,
          p.address,
          p.status,
          p.created_at,
          p.updated_at,
          p.account_id,
          a.firstname,
          a.lastname,
          COALESCE(a.profile_img_metadata->>'secure_url', '') AS agent_profile_img,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'public_id', pi.public_id,
                  'secure_url', pi.metadata->>'secure_url',
                  'display_order', pi.display_order
                ) ORDER BY pi.display_order
              )
              FROM property_images pi
              WHERE pi.property_id = p.property_id
            ),
            '[]'
          ) AS images
        FROM property p
        LEFT JOIN accounts a ON p.account_id = a.account_id
        WHERE p.property_id = $1;
      `;
      const result = await PG_DB.query(query, [property_id]);

      if (result.length === 0) {
        return null;
      }
      return result[0];
    } catch (error) {
      throw new Error(`Failed to fetch property: ${error.message}`);
    }
  }  

  // Save images to property_images table
  
  static async savePropertyImages(propertyId, cloudinaryResults) {
    try {
      const results = await PG_DB.transaction(
        ...cloudinaryResults.map((result, index) => () => {
          const query = `
            INSERT INTO property_images (property_id, public_id, metadata, display_order)
            VALUES ($1, $2, $3, $4)
            RETURNING *
          `;
          const metadata = {
            secure_url: result.secure_url,
            format: result.format,
            version: result.version,
          };
          const values = [propertyId, result.public_id, metadata, index];
          return { query, values };
        })
      );
      return results;
    } catch (error) {
      throw new Error(`Failed to save property images: ${error.message}`);
    }
  }

   static async uploadPropertyWithImages(resource, cloudinaryResults) {
    try {
      const [property, ...savedImages] = await PG_DB.transaction(
        // Insert property
        () => ({
          query: `
            INSERT INTO property (${Object.keys(resource).join(',')})
            VALUES (${Object.keys(resource).map((_, i) => `$${i + 1}`).join(',')})
            RETURNING *
          `,
          values: Object.values(resource),
        }),
        // Insert images
        ...cloudinaryResults.map((result, index) => () => {
          const query = `
            INSERT INTO property_images (property_id, public_id, metadata, display_order)
            VALUES ($1, $2, $3, $4)
            RETURNING *
          `;
          const metadata = {
            secure_url: result.secure_url,
            format: result.format,
            version: result.version,
          };
          const values = [resource.property_id, result.public_id, metadata, index];
          return { query, values };
        })
      );

      return {
        property: property[0],
        images: savedImages.map((img) => ({
          public_id: img.public_id,
          secure_url: img.metadata.secure_url,
          display_order: img.display_order,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to save property and images: ${error.message}`);
    }
  }

  static async updateProperty({ property_id, updates, cloudinaryResults }) {
    try {
        // Step 1: Update only the property data inside the transaction
        const result = await PG_DB.transaction(() => {
        const queryParams = [];
        const setClauses = [];

        Object.keys(updates).forEach((key, index) => {
            setClauses.push(`"${key}" = $${index + 1}`);
            queryParams.push(updates[key]);
        });

        queryParams.push(property_id);
        const setClause = setClauses.join(', ');

        return {
            query: `
            UPDATE property
            SET ${setClause}
            WHERE property_id = $${queryParams.length}
            RETURNING *;
            `,
            values: queryParams,
        };
        });

        // Step 2: Save images separately (outside transaction)
        if (cloudinaryResults?.length > 0) {
        await DB_Property_Model.savePropertyImages(property_id, cloudinaryResults);
        }

        return result;
    } catch (error) {
        throw new Error(`Failed to update property: ${error.message}`);
    }
  }

  static async checkImageExistsInDB(property_id, public_id) {
    try {
      const query = `
        SELECT 1
        FROM property_images
        WHERE property_id = $1 AND public_id = $2 LIMIT 1;
      `;
      const result = await PG_DB.query(query, [property_id, public_id]);
       if(result.length < 1) {
            return false;
        }
        return true;
    } catch (error) {
      throw new Error(`Failed to check image existence in database: ${error.message}`);
    }
  }

  static async removeImageFromAPropertyImages({ property_id, public_id }) {
    try {
        const result = await PG_DB.query(
          `
          DELETE FROM property_images
          WHERE property_id = $1 AND public_id = $2
          RETURNING public_id;
        `,
          [property_id, public_id]
        );
        if(result.length === 0) {
            return false
        }
      return {
        result,
        public_id,
      };
    } catch (error) {
      throw new Error(`Failed to delete image from database: ${error.message}`);
    }
  }

  // Helper to check remaining images
  static async getImageCount({ property_id }) {
    try {
      const query = `
        SELECT COUNT(*) AS count
        FROM property_images
        WHERE property_id = $1;
      `;
      const result = await PG_DB.query(query, [property_id]);
      return parseInt(result[0].count) || 0;
    } catch (error) {
      throw new Error(`Failed to count images: ${error.message}`);
    }
  }

    static async DeletePropertyById({property_id}){
        try{
            // Note that the property_images table has a foreign key constraint 
            // that automatically deletes all images associated to that property
            //  when the property is deleted.
            // If you remove the constraint, you will have to implement the logic here.
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
    try {
      const {
        title,
        country,
        state,
        address,
        status,
        category,
        available_for,
        min_price,
        max_price,
        property_features,
        limit = 6,
        offset = 0,
      } = filters;

      const conditions = [];
      const values = [];
      let idx = 1;

      // LIKE-based filters
      const likeFields = { title, country, state, address, status, category, available_for };
      for (const [field, value] of Object.entries(likeFields)) {
        if (value) {
          conditions.push(`p.${field} ILIKE $${idx}`);
          values.push(`%${value}%`);
          idx++;
        }
      }

      // Price filters
      if (min_price) {
        conditions.push(`p.price >= $${idx}`);
        values.push(min_price);
        idx++;
      }
      if (max_price) {
        conditions.push(`p.price <= $${idx}`);
        values.push(max_price);
        idx++;
      }

      // JSONB property_features filtering
      if (property_features && typeof property_features === 'object') {
        for (const [key, value] of Object.entries(property_features)) {
          if (value) {
            conditions.push(`p.property_features ->> '${key}' ILIKE $${idx}`);
            values.push(`%${value}%`);
            idx++;
          }
        }
      }

      // Build WHERE clause
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Main query with single image
      const mainQuery = `
        SELECT 
          p.id,
          p.property_id,
          p.property_features,
          p.title,
          p.category,
          p.country,
          p.state,
          p.price,
          p.available_for,
          COALESCE(
            json_build_object(
              'public_id', pi.public_id,
              'secure_url', pi.metadata->>'secure_url',
              'display_order', pi.display_order
            ),
            '{}'
          ) AS image
        FROM property p
        LEFT JOIN (
          SELECT DISTINCT ON (property_id) property_id, public_id, metadata, display_order
          FROM property_images
          ORDER BY property_id, display_order ASC
        ) pi ON p.property_id = pi.property_id
        ${whereClause}
        ORDER BY p.id DESC
        LIMIT $${idx} OFFSET $${idx + 1}
      `;
      values.push(limit, offset);

      const result = await PG_DB.query(mainQuery, values);

      // Get total count
      const countQuery = `SELECT COUNT(*) AS total FROM property p ${whereClause}`;
      const countValues = values.slice(0, idx - 1); // Exclude limit/offset
      const countResult = await PG_DB.query(countQuery, countValues);
      const total = parseInt(countResult[0]?.total) || 0;

      if (result.length > 0) {
        return { result, total };
      }
      return { result: [], total: 0 };
    } catch (error) {
      throw new Error(`Failed to search properties: ${error.message}`);
    }
  }

}

module.exports = DB_Property_Model;

