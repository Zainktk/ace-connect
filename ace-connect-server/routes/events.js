const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/events
 * @desc    Get all upcoming events
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.get('db');
        // Strict Role-Based Filtering
        let query;
        let queryParams;

        if (req.user.role === 'organizer') {
            // Organizer: See ONLY their own events
            query = `SELECT e.*, 
            COALESCE(p.name, u.email) as organizer_name,
            u.is_organizer_verified,
            u.verification_status as organizer_verification_status,
            u.email as organizer_email,
            (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) as participant_count,
            EXISTS(SELECT 1 FROM event_participants WHERE event_id = e.id AND user_id = $1) as is_joined
            FROM events e
            JOIN users u ON e.organizer_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE e.organizer_id = $1
            ORDER BY e.event_date ASC`;
            queryParams = [req.user.id];
        } else {
            // Player: See ALL upcoming events
            query = `SELECT e.*, 
            COALESCE(p.name, u.email) as organizer_name,
            u.is_organizer_verified,
            u.verification_status as organizer_verification_status,
            u.email as organizer_email,
            (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) as participant_count,
            EXISTS(SELECT 1 FROM event_participants WHERE event_id = e.id AND user_id = $1) as is_joined
            FROM events e
            JOIN users u ON e.organizer_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            ORDER BY e.event_date ASC`;
            queryParams = [req.user.id];
        }

        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   POST /api/events
 * @desc    Create a new event
 * @access  Private
 */
router.post('/', authMiddleware, [
    body('title').trim().notEmpty(),
    body('eventDate').isISO8601(),
    body('title').trim().notEmpty(),
    body('eventDate').isISO8601(),
    body('location').trim().notEmpty(),
    body('latitude').optional().isFloat(),
    body('longitude').optional().isFloat()
], async (req, res) => {
    try {
        // Enforce Organizer Role
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ error: 'Only organizers can create events' });
        }
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, description, eventDate, location, price, maxParticipants, skillLevelMin, skillLevelMax, imageUrl, latitude, longitude } = req.body;
        const pool = req.app.get('db');

        const result = await pool.query(
            `INSERT INTO events 
            (organizer_id, title, description, event_date, location, price, max_participants, skill_level_min, skill_level_max, image_url, latitude, longitude)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [req.user.id, title, description, eventDate, location, price || 0, maxParticipants, skillLevelMin, skillLevelMax, imageUrl, latitude || null, longitude || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   POST /api/events/:id/join
 * @desc    Join an event
 * @access  Private
 */
router.post('/:id/join', authMiddleware, async (req, res) => {
    try {
        // Enforce Player Role
        if (req.user.role === 'organizer') {
            return res.status(403).json({ error: 'Organizers cannot join events' });
        }
        const { id } = req.params;
        const pool = req.app.get('db');

        // Check if event exists and get current status
        const eventResult = await pool.query(
            `SELECT e.*, 
            (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) as current_participants
            FROM events e WHERE e.id = $1`,
            [id]
        );

        if (eventResult.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = eventResult.rows[0];

        // Check if event is full
        if (event.max_participants && event.current_participants >= event.max_participants) {
            return res.status(400).json({ error: 'Event is full' });
        }

        // Check if already joined
        const existing = await pool.query(
            'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Already joined this event' });
        }

        // Determine initial payment status
        const initialPaymentStatus = parseFloat(event.price) > 0 ? 'pending' : 'free';

        // Add participant
        await pool.query(
            'INSERT INTO event_participants (event_id, user_id, payment_status) VALUES ($1, $2, $3)',
            [id, req.user.id, initialPaymentStatus]
        );

        res.json({
            message: 'Successfully joined event',
            paymentStatus: initialPaymentStatus,
            price: event.price
        });
    } catch (error) {
        console.error('Join event error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
