const express = require('express');
const router = express.Router();

// GET /api/settings/public
// Returns public-facing site settings (branding, UI strings)
router.get('/public', async (req, res) => {
    const pool = req.app.get('db');
    try {
        const query = `
            SELECT key, value 
            FROM site_settings 
            WHERE category IN ('branding', 'general', 'ui')
        `;
        const result = await pool.query(query);

        // Convert to a key-value object for easier frontend consumption
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });

        res.json(settings);
    } catch (err) {
        console.error('Error fetching public settings:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
