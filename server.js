const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000 // 25 seconds
});

// Serve React build files
app.use(express.static(path.join(__dirname, 'build')));

// Socket.IO logic
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('message', (data) => {
    io.emit('message', data); // Broadcast to all
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));