const express = require('express');
     const http = require('http');
     const { Server } = require('socket.io');
     const path = require('path');

     const app = express();
     const server = http.createServer(app);
     const io = new Server(server, {
       cors: {
         origin: "*",
         methods: ["GET", "POST"]
       },
       connectionStateRecovery: {
         maxDisconnectionDuration: 120000
       }
     });

     // Store numbers on the server
     const numbers = {
       DRS: [],
       Override: [],
       'Check Date': []
     };

     io.on('connection', (socket) => {
       console.log('New client connected:', socket.id);

       // Send current numbers to the new client
       socket.emit('initial-state', numbers);

       socket.on('number-added', (data) => {
         // Add to server-side storage
         numbers[data.category].push(data.number);
         // Broadcast to all clients
         io.emit('number-update', data);
         console.log('Broadcasting:', data);
       });

       socket.on('number-deleted', (data) => {
         // Remove from server-side storage
         numbers[data.category].splice(data.index, 1);
         // Broadcast deletion to all clients
         io.emit('number-deleted', data);
       });

       socket.on('disconnect', () => {
         console.log('Client disconnected:', socket.id);
       });
     });

     app.use(express.static(path.join(__dirname, 'build')));

     const PORT = process.env.PORT || 5000;
     server.listen(PORT, () => console.log(`Server running on port ${PORT}`));