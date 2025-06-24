require('dotenv').config();
const pg = require('pg');
const fs = require('fs')
const pfgf = require('../../../')


const { Pool,} = pg
 
const pool = new Pool({
  user: `${process.env.DB_USERNAME}`,
  password: `${process.env.PASSWORD}`,
  host:`${process.env.DB_HOST}`,
  port:`${process.env.DB_PORT}`,
  database: `${process.env.DATABASE}`,
  ssl:{
    rejectUnauthorized:true, //ensure to configure this later for  better security purpose
    ca:fs.readFileSync('./ca.pem').toString()
  }
})

// pool.on('error',()=>{
//   console.log('unable to connect to DB')
// })


class PG_DB {
  // Simple query using pool
  static async query(sql, values) {
    try {
      const result = values ? await pool.query(sql, values) : await pool.query(sql);
      return result.rows;
    } catch (err) {
      throw err;
    }
  }

  // Transaction method using a single client
  static async transaction(...callbacks) {
    const client = await pool.connect(); // Get a client from the pool
    try {
      await client.query('BEGIN');
      let previousResults;

      for (const cb of callbacks) {
        const { query, values } = cb(previousResults);
        const result = values ? await client.query(query, values) : await client.query(query);
        previousResults = result.rows;
      }

      await client.query('COMMIT');
      return previousResults;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release(); // Important: release client back to the pool
    }
  }
}

module.exports = PG_DB;
