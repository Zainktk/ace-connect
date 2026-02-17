const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const matchmakingRoutes = require('./routes/matchmaking');
const userRoutes = require('./routes/users');
const notificationService = require('./services/notificationService');
const PayoutService = require('./services/payoutService');

// Initialize Services
notificationService.initialize();

const app = express();
const port = process.env.PORT || 3000;

// Database Connection
const dbConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for most cloud DBs like Supabase/Render
    }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    };

const pool = new Pool(dbConfig);

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Database connected successfully at:', res.rows[0].now);
    }
});

// Make pool available to routes
app.set('db', pool);

// Start Background Services
const payoutService = new PayoutService(pool);
payoutService.start();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to AceConnect API',
        status: 'active',
        version: '1.0.0'
    });
});

const eventsRoutes = require('./routes/events');
const paymentsRoutes = require('./routes/payments');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/payments', paymentsRoutes);

// Socket.io Setup
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_match', (matchId) => {
        socket.join(`match_${matchId}`);
        console.log(`Socket ${socket.id} joined match_${matchId}`);
    });

    socket.on('send_message', async (data) => {
        const { matchId, senderId, content } = data;
        try {
            const result = await pool.query(
                'INSERT INTO messages (match_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
                [matchId, senderId, content]
            );
            const newMessage = result.rows[0];
            io.to(`match_${matchId}`).emit('new_message', newMessage);

            // Get match participants to find recipient
            const matchResult = await pool.query(
                'SELECT player1_id, player2_id FROM matches WHERE id = $1',
                [matchId]
            );

            if (matchResult.rows[0]) {
                const match = matchResult.rows[0];
                const recipientId = match.player1_id === senderId ? match.player2_id : match.player1_id;

                // Get sender's name
                const senderProfile = await pool.query(
                    'SELECT name FROM profiles WHERE user_id = $1',
                    [senderId]
                );

                if (senderProfile.rows[0]) {
                    notificationService.sendMessageNotification(
                        recipientId,
                        senderProfile.rows[0].name,
                        content
                    );
                }
            }
        } catch (err) {
            console.error('Socket message error:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port} (HTTP + WebSockets)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    pool.end();
    process.exit(0);
});
