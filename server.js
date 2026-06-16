const express = require('express');
const cors = require('cors');
const { ExpressPeerServer } = require('peer');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
    res.send('FaceLink Signaling & Peer Server is running.');
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/myapp'
});
app.use('/peerjs', peerServer);

const io = require('socket.io')(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    socket.on('join-room', (roomId, userId, userName) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId, userName);

        // Listen for chat messages sent from this client and broadcast them to the room
        socket.on('send-chat-message', (messageText) => {
            socket.to(roomId).emit('receive-chat-message', {
                text: messageText,
                senderName: userName
            });
        });

        socket.on('toggle-track', (type, enabled) => {
            socket.to(roomId).emit('user-track-toggled', userId, type, enabled);
        });

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });
});