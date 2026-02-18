const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/users/report
 * @desc    Report a user for misconduct
 * @access  Private
 */
router.post('/report', authMiddleware, [
    body('reportedId').isInt(),
    body('reason').notEmpty().trim(),
    body('details').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { reportedId, reason, details } = req.body;
        const pool = req.app.get('db');

        if (req.user.id === parseInt(reportedId)) {
            return res.status(400).json({ error: 'You cannot report yourself' });
        }

        await pool.query(
            `INSERT INTO user_reports (reporter_id, reported_id, reason, details)
             VALUES ($1, $2, $3, $4)`,
            [req.user.id, reportedId, reason, details]
        );

        res.status(201).json({ message: 'User reported successfully. Our team will review this shortly.' });
    } catch (error) {
        console.error('Report user error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   POST /api/users/block
 * @desc    Block a user
 * @access  Private
 */
router.post('/block', authMiddleware, [
    body('blockedId').isInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { blockedId } = req.body;
        const pool = req.app.get('db');

        if (req.user.id === parseInt(blockedId)) {
            return res.status(400).json({ error: 'You cannot block yourself' });
        }

        await pool.query(
            `INSERT INTO blocked_users (blocker_id, blocked_id)
             VALUES ($1, $2)
             ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
            [req.user.id, blockedId]
        );

        res.json({ message: 'User blocked successfully' });
    } catch (error) {
        console.error('Block user error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   PUT /api/users/fcm-token
 * @desc    Update user's FCM Push Notification Token
 * @access  Private
 */
router.put('/fcm-token', authMiddleware, [
    body('token').notEmpty().withMessage('Token is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { token } = req.body;
        const pool = req.app.get('db');

        await pool.query(
            'UPDATE users SET fcm_token = $1 WHERE id = $2',
            [token, req.user.id]
        );

        res.json({ message: 'FCM token updated successfully' });
    } catch (error) {
        console.error('Update FCM token error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   GET /api/users
 * @desc    Get all players (except current user)
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.get('db');

        const result = await pool.query(
            `SELECT u.id, p.name, p.location, p.ntrp_rating, p.photo_url
             FROM users u
             JOIN profiles p ON u.id = p.user_id
             WHERE u.id != $1
             ORDER BY p.name ASC`,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get players error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
