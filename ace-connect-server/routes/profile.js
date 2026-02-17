const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/profile/:userId
 * @desc    Get user profile by ID
 * @access  Public
 */
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const pool = req.app.get('db');

        const result = await pool.query(
            `SELECT u.id, u.email, p.name, p.ntrp_rating, p.bio, p.location, p.photo_url, p.latitude, p.longitude,
             u.is_organizer_verified, u.wallet_balance,
             (SELECT AVG(rating)::FLOAT FROM match_reviews WHERE subject_id = u.id) as karma_rating,
             (SELECT COUNT(*) FROM match_reviews WHERE subject_id = u.id) as review_count
             FROM users u
             LEFT JOIN profiles p ON u.id = p.user_id
             WHERE u.id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            ntrpRating: user.ntrp_rating,
            bio: user.bio,
            location: user.location,
            photoUrl: user.photo_url,
            karmaRating: user.karma_rating || 5.0, // Default to 5.0
            karmaRating: user.karma_rating || 5.0, // Default to 5.0
            reviewCount: parseInt(user.review_count) || 0,
            latitude: user.latitude,
            longitude: user.longitude,
            isOrganizerVerified: user.is_organizer_verified,
            walletBalance: parseFloat(user.wallet_balance) || 0
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   PUT /api/profile
 * @desc    Update current user's profile
 * @access  Private
 */
router.put('/', authMiddleware, [
    body('name').optional().trim().notEmpty(),
    body('ntrpRating').optional().isFloat({ min: 1.0, max: 7.0 }),
    body('bio').optional().trim(),
    body('location').optional().trim(),
    body('location').optional().trim(),
    body('photoUrl').optional().isURL(),
    body('latitude').optional().isFloat(),
    body('longitude').optional().isFloat()
], async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, ntrpRating, bio, location, photoUrl, latitude, longitude } = req.body;
        const pool = req.app.get('db');

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (ntrpRating !== undefined) {
            updates.push(`ntrp_rating = $${paramCount++}`);
            values.push(ntrpRating);
        }
        if (bio !== undefined) {
            updates.push(`bio = $${paramCount++}`);
            values.push(bio);
        }
        if (location !== undefined) {
            updates.push(`location = $${paramCount++}`);
            values.push(location);
        }
        if (photoUrl !== undefined) {
            updates.push(`photo_url = $${paramCount++}`);
            values.push(photoUrl);
            values.push(photoUrl);
        }
        if (latitude !== undefined) {
            updates.push(`latitude = $${paramCount++}`);
            values.push(latitude);
        }
        if (longitude !== undefined) {
            updates.push(`longitude = $${paramCount++}`);
            values.push(longitude);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(req.user.id);

        const query = `
            UPDATE profiles 
            SET ${updates.join(', ')}
            WHERE user_id = $${paramCount}
            RETURNING name, ntrp_rating, bio, location, photo_url, latitude, longitude
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const profile = result.rows[0];

        res.json({
            id: req.user.id,
            email: req.user.email,
            name: profile.name,
            ntrpRating: profile.ntrp_rating,
            bio: profile.bio,
            location: profile.location,
            location: profile.location,
            photoUrl: profile.photo_url,
            latitude: profile.latitude,
            longitude: profile.longitude
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
