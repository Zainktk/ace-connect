const express = require('express');
const router = express.Router();

// GET /api/announcements/active
// Returns the currently active announcement with highest priority
router.get('/active', async (req, res) => {
    const pool = req.app.get('db');
    try {
        const query = `
            SELECT id, title, message, icon 
            FROM announcements 
            WHERE is_active = TRUE 
            AND start_date <= NOW() 
            AND end_date >= NOW() 
            ORDER BY priority DESC, created_at DESC 
            LIMIT 1
        `;
        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.json(null);
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching active announcement:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
