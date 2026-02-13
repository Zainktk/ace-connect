const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const { sendOTPEmail } = require('../utils/email');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
    body('ntrpRating').optional().isFloat({ min: 1.0, max: 7.0 })
], async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, name, ntrpRating } = req.body;
        const pool = req.app.get('db');

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create user
        const userResult = await pool.query(
            'INSERT INTO users (email, password_hash, otp_code, otp_expires_at) VALUES ($1, $2, $3, $4) RETURNING id, email, created_at',
            [email, passwordHash, otp, otpExpiresAt]
        );

        const user = userResult.rows[0];

        // Create profile
        await pool.query(
            'INSERT INTO profiles (user_id, name, ntrp_rating, location) VALUES ($1, $2, $3, $4)',
            [user.id, name, ntrpRating || null, req.body.location || null]
        );

        // Send OTP Email
        const emailSent = await sendOTPEmail(email, otp, name);

        res.status(201).json({
            message: 'Registration successful. Please verify your email.',
            email,
            emailSent // Metadata for debugging/dev
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;
        const pool = req.app.get('db');

        // Find user
        const userResult = await pool.query(
            'SELECT id, email, password_hash, is_verified, is_banned FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = userResult.rows[0];

        // Check if banned
        if (user.is_banned) {
            return res.status(403).json({ error: 'This account has been suspended for violating community guidelines.' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check verification
        if (!user.is_verified) {
            return res.status(403).json({
                error: 'Account not verified. Please verify your email.',
                requiresVerification: true,
                email: user.email
            });
        }

        // Get profile and karma
        const profileResult = await pool.query(
            `SELECT p.name, p.ntrp_rating, p.bio, p.location, p.photo_url,
             (SELECT AVG(rating)::FLOAT FROM match_reviews WHERE subject_id = $1) as karma_rating,
             (SELECT COUNT(*) FROM match_reviews WHERE subject_id = $1) as review_count
             FROM profiles p WHERE p.user_id = $1`,
            [user.id]
        );

        const profile = profileResult.rows[0];

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: profile?.name,
                ntrpRating: profile?.ntrp_rating,
                bio: profile?.bio,
                location: profile?.location,
                photoUrl: profile?.photo_url,
                karmaRating: profile?.karma_rating || 5.0,
                reviewCount: parseInt(profile?.review_count) || 0
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and activate account
 * @access  Public
 */
router.post('/verify-otp', [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 })
], async (req, res) => {
    try {
        const { email, otp } = req.body;
        const pool = req.app.get('db');

        const result = await pool.query(
            'SELECT id, otp_code, otp_expires_at, is_verified FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        if (user.is_verified) {
            return res.status(400).json({ error: 'Account already verified' });
        }

        if (user.otp_code !== otp) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        if (new Date() > new Date(user.otp_expires_at)) {
            return res.status(400).json({ error: 'Verification code has expired' });
        }

        // Activate user
        await pool.query(
            'UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires_at = NULL WHERE id = $1',
            [user.id]
        );

        res.json({ message: 'Account verified successfully. You can now login.' });
    } catch (error) {
        console.error('OTP Verification error:', error);
        res.status(500).json({ error: 'Server error during verification' });
    }
});

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP code
 * @access  Public
 */
router.post('/resend-otp', [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const { email } = req.body;
        const pool = req.app.get('db');

        const result = await pool.query(
            'SELECT u.id, u.is_verified, p.name FROM users u JOIN profiles p ON u.id = p.user_id WHERE u.email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        if (user.is_verified) {
            return res.status(400).json({ error: 'Account already verified' });
        }

        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await pool.query(
            'UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3',
            [otp, otpExpiresAt, user.id]
        );

        // Send OTP Email
        await sendOTPEmail(email, otp, user.name);

        res.json({ message: 'New verification code sent to your email.' });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ error: 'Server error during resend' });
    }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.get('db');

        // Get user, profile and karma
        const result = await pool.query(
            `SELECT u.id, u.email, p.name, p.ntrp_rating, p.bio, p.location, p.photo_url,
             (SELECT AVG(rating)::FLOAT FROM match_reviews WHERE subject_id = u.id) as karma_rating,
             (SELECT COUNT(*) FROM match_reviews WHERE subject_id = u.id) as review_count
             FROM users u
             LEFT JOIN profiles p ON u.id = p.user_id
             WHERE u.id = $1`,
            [req.user.id]
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
            karmaRating: user.karma_rating || 5.0,
            reviewCount: parseInt(user.review_count) || 0
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
