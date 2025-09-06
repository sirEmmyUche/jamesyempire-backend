const PG_DB = require('../database/rdbms/postgres');

class AuthHelperModel {
    static async getResourceOwner(resourceType, id) {
        try{
             let table, ownerColumn,resource_id;
            switch (resourceType) {
            case 'property':
                table = 'property';
                ownerColumn = 'account_id';
                resource_id = 'property_id';
                break;
            case 'blog':
                table = 'blog';
                ownerColumn = 'account_id';
                resource_id = 'blog_id';
                break;
            case 'ads_response':
                table = 'ads_response';
                ownerColumn = 'account_id';
                resource_id = 'ads_response_id';
                break;
            case 'comment':
                table = 'comments';
                ownerColumn = 'account_id';
                resource_id = 'comment_id';
                break;
            default:
                throw new Error(`Unsupported resource type: ${resourceType}`);
            }

            const rows = await PG_DB.query(
            `SELECT ${ownerColumn} FROM ${table} WHERE ${resource_id} = $1 LIMIT 1`,
            [id]
            );

            return rows.length > 0 ? rows[0][ownerColumn] : null;
        }catch(error){
            throw error
        }
    }
}

module.exports = AuthHelperModel