require('dotenv').config();
require('./src/database/rdbms/postgres');
const express = require('express');
const cors = require('cors');
const api_route_v1 = require('./src/api/v1/index');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health-check', (req, res) => {
    res.status(200);
    res.send('OK');
});
app.use("/public", express.static('public'));
app.use(cors({
    // origin: '*',
    origin:['http://localhost:5173','https://jamesyempire.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization','Access-Control-Allow-Origin'],
    credentials: true
}));

app.use('/v1', api_route_v1);


app.listen(PORT,()=>{
    console.log(`Server is listening on port: ${PORT}`)
});