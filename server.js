const express = require('express');
const cors = require('cors');
const { ExpressPeerServer } = require('peer');

const app = express();

// Set up explicit origin matching for production and local environments
const allowedOrigins = [
    "https://facelink.vercel.app",
    "http://localhost:8080",
    "http://127.0.0.1:8080"
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.get('/', (req, res) => {
    res.send('FaceLink Signaling & Peer Server is running.');
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Configure PeerServer with exact origin access rules
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/myapp',
    corsOptions: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});
app.use('/peerjs', peerServer);

// Instantiate Socket.io to securely map incoming client origins
const io = require('socket.io')(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on('connection', (socket) => {
    socket.on('join-room', (roomId, userId, userName) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId, userName);

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