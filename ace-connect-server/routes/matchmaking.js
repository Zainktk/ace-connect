const express = require('express');
const { body, validationResult, query } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const { calculateMatchScore, isWithinSkillRange } = require('../utils/matchmaking');
const notificationService = require('../services/notificationService');

const router = express.Router();

/**
 * @route   POST /api/matchmaking/requests
 * @desc    Create a new match request
 * @access  Private
 */
router.post('/requests', authMiddleware, [
    body('matchType').isIn(['singles', 'doubles']),
    body('preferredDate').optional({ nullable: true }).isISO8601(),
    body('preferredTime').optional({ nullable: true }).matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('location').optional({ nullable: true }).trim(),
    body('skillLevelMin').optional({ nullable: true }).isFloat({ min: 1.0, max: 7.0 }),
    body('skillLevelMax').optional({ nullable: true }).isFloat({ min: 1.0, max: 7.0 }),
    body('notes').optional({ nullable: true }).trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            matchType,
            preferredDate,
            preferredTime,
            location,
            skillLevelMin,
            skillLevelMax,
            courtType,
            preferredTimeRange,
            latitude,
            longitude,
            notes
        } = req.body;

        const pool = req.app.get('db');

        const result = await pool.query(
            `INSERT INTO match_requests 
             (user_id, match_type, preferred_date, preferred_time, location, 
              skill_level_min, skill_level_max, court_type, preferred_time_range, 
              latitude, longitude, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [req.user.id, matchType, preferredDate, preferredTime, location,
                skillLevelMin, skillLevelMax, courtType || 'any', preferredTimeRange,
                latitude, longitude, notes]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create match request error:', error.message, error.stack);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   PUT /api/matchmaking/requests/:id
 * @desc    Update a match request
 * @access  Private
 */
router.put('/requests/:id', authMiddleware, [
    body('matchType').optional().isIn(['singles', 'doubles']),
    body('preferredDate').optional({ nullable: true }).isISO8601(),
    body('preferredTime').optional({ nullable: true }).matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('location').optional({ nullable: true }).trim(),
    body('skillLevelMin').optional({ nullable: true }).isFloat({ min: 1.0, max: 7.0 }),
    body('skillLevelMax').optional({ nullable: true }).isFloat({ min: 1.0, max: 7.0 }),
    body('notes').optional({ nullable: true }).trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const {
            matchType,
            preferredDate,
            preferredTime,
            location,
            skillLevelMin,
            skillLevelMax,
            courtType,
            preferredTimeRange,
            latitude,
            longitude,
            notes
        } = req.body;

        const pool = req.app.get('db');

        // Check ownership
        const existing = await pool.query('SELECT * FROM match_requests WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found or unauthorized' });
        }

        const result = await pool.query(
            `UPDATE match_requests 
             SET match_type = COALESCE($1, match_type),
                 preferred_date = COALESCE($2, preferred_date),
                 preferred_time = COALESCE($3, preferred_time),
                 location = COALESCE($4, location),
                 skill_level_min = COALESCE($5, skill_level_min),
                 skill_level_max = COALESCE($6, skill_level_max),
                 court_type = COALESCE($7, court_type),
                 preferred_time_range = COALESCE($8, preferred_time_range),
                 latitude = COALESCE($9, latitude),
                 longitude = COALESCE($10, longitude),
                 notes = COALESCE($11, notes),
                 updated_at = NOW()
             WHERE id = $12 AND user_id = $13
             RETURNING *`,
            [matchType, preferredDate, preferredTime, location,
                skillLevelMin, skillLevelMax, courtType, preferredTimeRange,
                latitude, longitude, notes, id, req.user.id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update match request error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   GET /api/matchmaking/requests
 * @desc    Get available match requests (filtered and scored)
 * @access  Private
 */
router.get('/requests', authMiddleware, [
    query('matchType').optional().isIn(['singles', 'doubles']),
    query('minRating').optional().isFloat({ min: 1.0, max: 7.0 }),
    query('maxRating').optional().isFloat({ min: 1.0, max: 7.0 }),
    query('location').optional().trim(),
    query('courtType').optional().isIn(['hard', 'clay', 'grass', 'indoor', 'any']),
    query('timeRange').optional().trim(),
    query('lat').optional().isFloat(),
    query('lng').optional().isFloat(),
    query('radius').optional().isFloat({ min: 1, max: 500 }) // Radius in km
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { matchType, minRating, maxRating, location, courtType, timeRange, lat, lng, radius } = req.query;
        const pool = req.app.get('db');

        // Get current user's profile
        const userProfile = await pool.query(
            'SELECT ntrp_rating, location, latitude, longitude FROM profiles WHERE user_id = $1',
            [req.user.id]
        );

        if (userProfile.rows.length === 0) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        const currentUser = userProfile.rows[0];

        // Build query
        const queryParams = [req.user.id];
        let distanceSelect = '';

        if (lat && lng) {
            // Haversine formula for distance in km
            distanceSelect = `, (6371 * acos(cos(radians($2)) * cos(radians(mr.latitude)) * cos(radians(mr.longitude) - radians($3)) + sin(radians($2)) * sin(radians(mr.latitude)))) AS distance`;
            queryParams.push(lat, lng);
        }

        let queryText = `
            SELECT mr.*, p.name, p.ntrp_rating, p.location as user_location, u.email, u.is_verified,
            EXISTS(SELECT 1 FROM match_invitations mi WHERE mi.match_request_id = mr.id AND mi.sender_id = $1) as invitation_sent
            ${distanceSelect}
            FROM match_requests mr
            JOIN users u ON mr.user_id = u.id
            JOIN profiles p ON u.id = p.user_id
            WHERE mr.status = 'open'
            AND mr.user_id != $1
        `;

        if (matchType) {
            queryParams.push(matchType);
            queryText += ` AND mr.match_type = $${queryParams.length}`;
        }

        if (location) {
            queryParams.push(`%${location}%`);
            queryText += ` AND LOWER(mr.location) LIKE LOWER($${queryParams.length})`;
        }

        if (courtType && courtType !== 'any') {
            queryParams.push(courtType);
            queryText += ` AND mr.court_type = $${queryParams.length}`;
        }

        if (timeRange) {
            queryParams.push(timeRange);
            queryText += ` AND mr.preferred_time_range = $${queryParams.length}`;
        }

        // Add distance filter if radius provided
        if (lat && lng && radius) {
            queryParams.push(radius);
            queryText += ` AND (6371 * acos(cos(radians($2)) * cos(radians(mr.latitude)) * cos(radians(mr.longitude) - radians($3)) + sin(radians($2)) * sin(radians(mr.latitude)))) <= $${queryParams.length}`;
        }

        if (lat && lng) {
            queryText += ' ORDER BY distance ASC';
        } else {
            queryText += ' ORDER BY mr.created_at DESC';
        }

        const result = await pool.query(queryText, queryParams);

        // Filter by skill level and calculate match scores
        const requests = result.rows
            .filter(request => {
                // Check if current user's rating is within request's skill range
                return isWithinSkillRange(request, currentUser.ntrp_rating);
            })
            .map(request => {
                // Calculate compatibility score
                const score = calculateMatchScore(request, currentUser);
                return {
                    ...request,
                    compatibility_score: score
                };
            })
            .filter(request => request.compatibility_score > 0)
            .sort((a, b) => b.compatibility_score - a.compatibility_score);

        res.json(requests);
    } catch (error) {
        console.error('Get match requests error:', error.message, error.stack);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   GET /api/matchmaking/requests/my
 * @desc    Get current user's match requests
 * @access  Private
 */
router.get('/requests/my', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.get('db');

        const result = await pool.query(
            `SELECT mr.*, 
             (SELECT COUNT(*) FROM match_invitations WHERE match_request_id = mr.id) as invitation_count
             FROM match_requests mr
             WHERE mr.user_id = $1
             ORDER BY mr.created_at DESC`,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get my requests error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   GET /api/matchmaking/requests/:id
 * @desc    Get specific match request
 * @access  Private
 */
router.get('/requests/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = req.app.get('db');

        const result = await pool.query(
            `SELECT mr.*, p.name, p.ntrp_rating, p.bio, p.location as user_location, p.photo_url
             FROM match_requests mr
             JOIN users u ON mr.user_id = u.id
             JOIN profiles p ON u.id = p.user_id
             WHERE mr.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Match request not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get match request error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   DELETE /api/matchmaking/requests/:id
 * @desc    Cancel/delete own match request
 * @access  Private
 */
router.delete('/requests/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = req.app.get('db');

        const result = await pool.query(
            'DELETE FROM match_requests WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Match request not found or unauthorized' });
        }

        res.json({ message: 'Match request deleted successfully' });
    } catch (error) {
        console.error('Delete match request error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   POST /api/matchmaking/invitations
 * @desc    Send match invitation
 * @access  Private
 */
router.post('/invitations', authMiddleware, [
    body('matchRequestId').isInt(),
    body('message').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { matchRequestId, message } = req.body;
        const pool = req.app.get('db');

        // Get match request and verify it exists and is open
        const requestResult = await pool.query(
            'SELECT * FROM match_requests WHERE id = $1 AND status = $2',
            [matchRequestId, 'open']
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Match request not found or closed' });
        }

        const matchRequest = requestResult.rows[0];

        // Can't invite yourself
        if (matchRequest.user_id === req.user.id) {
            return res.status(400).json({ error: 'Cannot send invitation to your own request' });
        }

        // Check if invitation already exists
        const existingInvitation = await pool.query(
            `SELECT * FROM match_invitations 
             WHERE match_request_id = $1 AND sender_id = $2`,
            [matchRequestId, req.user.id]
        );

        if (existingInvitation.rows.length > 0) {
            return res.status(400).json({ error: 'Invitation already sent' });
        }

        // Create invitation
        const result = await pool.query(
            `INSERT INTO match_invitations 
             (match_request_id, sender_id, recipient_id, message)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [matchRequestId, req.user.id, matchRequest.user_id, message]
        );

        // Get sender's name for notification
        const senderProfile = await pool.query(
            'SELECT name FROM profiles WHERE user_id = $1',
            [req.user.id]
        );

        // Send push notification to recipient
        if (senderProfile.rows[0]) {
            notificationService.sendInvitationNotification(
                matchRequest.user_id,
                senderProfile.rows[0].name
            );
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Send invitation error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   GET /api/matchmaking/invitations
 * @desc    Get received invitations
 * @access  Private
 */
router.get('/invitations', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.get('db');

        const result = await pool.query(
            `SELECT mi.*, mr.match_type, mr.preferred_date, mr.preferred_time, mr.location,
             p.name as sender_name, p.ntrp_rating as sender_rating, p.photo_url as sender_photo,
             u.is_verified as sender_is_verified
             FROM match_invitations mi
             JOIN match_requests mr ON mi.match_request_id = mr.id
             JOIN users u ON mi.sender_id = u.id
             JOIN profiles p ON u.id = p.user_id
             WHERE mi.recipient_id = $1 AND mi.status = 'pending'
             ORDER BY mi.created_at DESC`,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get invitations error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});


/**
 * @route   PUT /api/matchmaking/invitations/:id/accept
 * @desc    Accept match invitation
 * @access  Private
 */
router.put('/invitations/:id/accept', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = req.app.get('db');

        // Get invitation
        const invitationResult = await pool.query(
            `SELECT mi.*, mr.match_type, 
             TO_CHAR(mr.preferred_date, 'YYYY-MM-DD') as preferred_date, 
             TO_CHAR(mr.preferred_time, 'HH24:MI:SS') as preferred_time, 
             mr.location, mr.notes
             FROM match_invitations mi
             JOIN match_requests mr ON mi.match_request_id = mr.id
             WHERE mi.id = $1 AND mi.recipient_id = $2 AND mi.status = 'pending'`,
            [id, req.user.id]
        );

        if (invitationResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invitation not found or already processed' });
        }

        const invitation = invitationResult.rows[0];

        // Start transaction
        await pool.query('BEGIN');

        try {
            // Update invitation status
            await pool.query(
                'UPDATE match_invitations SET status = $1 WHERE id = $2',
                ['accepted', id]
            );

            // Create match
            const matchResult = await pool.query(
                `INSERT INTO matches 
                 (player1_id, player2_id, match_request_id, match_type, scheduled_time, location, notes, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'accepted')
                 RETURNING *`,
                [
                    invitation.recipient_id,
                    invitation.sender_id,
                    invitation.match_request_id,
                    invitation.match_type,
                    invitation.preferred_date && invitation.preferred_time
                        ? `${invitation.preferred_date} ${invitation.preferred_time}`
                        : null,
                    invitation.location,
                    invitation.notes
                ]
            );

            // Close match request
            await pool.query(
                'UPDATE match_requests SET status = $1 WHERE id = $2',
                ['closed', invitation.match_request_id]
            );

            await pool.query('COMMIT');

            res.json({
                invitation: { ...invitation, status: 'accepted' },
                match: matchResult.rows[0]
            });
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Accept invitation error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   PUT /api/matchmaking/invitations/:id/decline
 * @desc    Decline match invitation
 * @access  Private
 */
router.put('/invitations/:id/decline', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = req.app.get('db');

        const result = await pool.query(
            `UPDATE match_invitations 
             SET status = 'declined'
             WHERE id = $1 AND recipient_id = $2 AND status = 'pending'
             RETURNING *`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invitation not found or already processed' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Decline invitation error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   GET /api/matchmaking/matches/my
 * @desc    Get current user's matches (upcoming and past)
 * @access  Private
 */
router.get('/matches/my', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.get('db');

        const result = await pool.query(
            `SELECT m.*, 
             p_opp.name as opponent_name, 
             p_opp.ntrp_rating as opponent_rating, 
             p_opp.photo_url as opponent_photo,
             u_opp.is_verified as opponent_is_verified,
             EXISTS(SELECT 1 FROM match_reviews WHERE match_id = m.id AND reviewer_id = $1) as user_reviewed
             FROM matches m
             JOIN profiles p_opp ON (
                 (m.player1_id = $1 AND m.player2_id = p_opp.user_id) OR
                 (m.player2_id = $1 AND m.player1_id = p_opp.user_id)
             )
             JOIN users u_opp ON p_opp.user_id = u_opp.id
             WHERE m.player1_id = $1 OR m.player2_id = $1
             ORDER BY m.scheduled_time ASC NULLS LAST, m.created_at DESC`,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get my matches error:', error.message, error.stack);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   POST /api/matchmaking/matches/:id/review
 * @desc    Submit a review for a match opponent
 * @access  Private
 */
router.post('/matches/:id/review', authMiddleware, [
    body('rating').isInt({ min: 1, max: 5 }),
    body('category').optional().trim(),
    body('feedback').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { rating, category, feedback } = req.body;
        const pool = req.app.get('db');

        // Verify match exists and user was a participant
        const matchResult = await pool.query(
            'SELECT * FROM matches WHERE id = $1 AND (player1_id = $2 OR player2_id = $2)',
            [id, req.user.id]
        );

        if (matchResult.rows.length === 0) {
            return res.status(404).json({ error: 'Match not found or you were not a participant' });
        }

        const match = matchResult.rows[0];
        const subjectId = match.player1_id === req.user.id ? match.player2_id : match.player1_id;

        // Submit review
        await pool.query(
            `INSERT INTO match_reviews (match_id, reviewer_id, subject_id, rating, category, feedback)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (match_id, reviewer_id) DO UPDATE SET
             rating = EXCLUDED.rating,
             category = EXCLUDED.category,
             feedback = EXCLUDED.feedback`,
            [id, req.user.id, subjectId, rating, category, feedback]
        );

        res.json({ message: 'Review submitted successfully' });
    } catch (error) {
        console.error('Submit review error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   GET /api/matchmaking/matches/:id/messages
 * @desc    Get message history for a match
 * @access  Private
 */
router.get('/matches/:id/messages', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = req.app.get('db');

        // Verify match involvement
        const matchResult = await pool.query(
            'SELECT * FROM matches WHERE id = $1 AND (player1_id = $2 OR player2_id = $2)',
            [id, req.user.id]
        );

        if (matchResult.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized to view these messages' });
        }

        const messages = await pool.query(
            'SELECT * FROM messages WHERE match_id = $1 ORDER BY created_at ASC',
            [id]
        );

        res.json(messages.rows);
    } catch (error) {
        console.error('Get messages error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   GET /api/matchmaking/matches/history
 * @desc    Get completed match history for the current user
 * @access  Private
 */
router.get('/matches/history', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.get('db');
        const result = await pool.query(
            `SELECT m.*, 
                    p1.name as player1_name, p1.photo_url as player1_photo,
                    p2.name as player2_name, p2.photo_url as player2_photo,
                    mr.match_type, mr.location
             FROM matches m
             JOIN profiles p1 ON m.player1_id = p1.user_id
             JOIN profiles p2 ON m.player2_id = p2.user_id
             LEFT JOIN match_requests mr ON m.match_request_id = mr.id
             WHERE (m.player1_id = $1 OR m.player2_id = $1)
             AND m.status = 'completed'
             ORDER BY m.match_date DESC`,
            [req.user.id]
        );

        // Map response to identify opponent
        const history = result.rows.map(match => {
            const isPlayer1 = match.player1_id === req.user.id;
            return {
                id: match.id,
                matchDate: match.match_date,
                score: match.score,
                matchType: match.match_type,
                location: match.location,
                opponentName: isPlayer1 ? match.player2_name : match.player1_name,
                opponentPhoto: isPlayer1 ? match.player2_photo : match.player1_photo,
                isWinner: match.score ? true : null // Placeholder for win/loss logic if added later
            };
        });

        res.json(history);
    } catch (error) {
        console.error('Get match history error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
