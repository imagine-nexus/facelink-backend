const express = require('express');
const cors = require('cors');

const app = express();

// Explicitly allow your Vercel deployment URL and local development environments
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
    res.send('FaceLink Signaling Server is running.');
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Initialize Socket.io without any port-sharing middleware interference
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