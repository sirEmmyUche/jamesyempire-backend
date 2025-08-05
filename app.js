require('dotenv').config();
require('./src/database/rdbms/postgres');
const express = require('express');
const cors = require('cors');
const http = require('http'); 
const api_route_v1 = require('./src/api/v1/index');
const WebSocketService = require('./src/services/websocket')

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health-check', (req, res) => {
    res.status(200);
    res.send('OK');
});
app.use("/public", express.static('public'));
app.use(cors({
    // origin: '*',
    origin:['http://localhost:5173',
        'https://www.jamesyempire.com',
        'https://jamesyempire-frontend.vercel.app',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization','Access-Control-Allow-Origin'],
    credentials: true
}));

app.use('/v1', api_route_v1);

// start listening to socket on provided port
const server = http.createServer(app);
const wsService = WebSocketService.initialize(server);

// app.listen(PORT,()=>{
//     console.log(`Server is listening on port: ${PORT}`)
// });

server.listen(PORT,()=>{
    console.log(`Server is listening on port: ${PORT}`)
});