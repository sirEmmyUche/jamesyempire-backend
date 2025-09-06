// permissions.js
module.exports = {
    user: ['read:any'],
    agent: ['read:any', 'create:own', 'update:own', 'delete:own', 'block:own'],
    admin: ['read:any', 'read:admin-only', 'create:own', 'update:own', 'delete:any', 'block:any'],
};
