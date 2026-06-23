const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Dynamic international origins array
const allowedOrigins = [
    process.env.FRONTEND_URL, 
    "https://facelink.vercel.app",
    "http://localhost:8080",
    "http://127.0.0.1:8080"
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.get('/health', (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date() });
});

const server = app.listen(PORT, () => {
    console.log(`[Production] Signaling gateway active on port ${PORT}`);
});

const io = require('socket.io')(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Track hosts to manage waiting rooms and permissions
const roomHosts = {}; 

io.on('connection', (socket) => {
    
    // 1. Waiting Room Logic
    socket.on('request-join', (roomId, userMeta) => {
        const hostId = roomHosts[roomId];
        if (hostId) {
            // Notify host that someone is waiting
            io.to(hostId).emit('join-request', { socketId: socket.id, ...userMeta });
        } else {
            // If no host exists, this first user becomes the host
            socket.emit('admitted', roomId, true);
        }
    });

    socket.on('admit-user', (socketId, roomId) => {
        io.to(socketId).emit('admitted', roomId, false);
    });

    // Standard join
    socket.on('join-room', (roomId, userId, userName, isHost) => {
        if (isHost) roomHosts[roomId] = socket.id;
        
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

        // 2. Hand Raising
        socket.on('raise-hand', (isRaised) => {
            socket.to(roomId).emit('user-hand-raised', userId, isRaised);
        });

        // 3. Host Controls (Mute All)
        socket.on('mute-all', () => {
            if (roomHosts[roomId] === socket.id) {
                socket.to(roomId).emit('force-mute');
            }
        });

        // 4. Whiteboard Sync
        socket.on('draw-line', (data) => {
            socket.to(roomId).emit('draw-line', data);
        });

        socket.on('disconnect', () => {
            if (roomHosts[roomId] === socket.id) delete roomHosts[roomId];
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });
});