const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Simulate a payment for an event
router.post('/pay-event', authenticateToken, async (req, res) => {
    const pool = req.app.get('db');
    const { eventId, amount } = req.body;
    const userId = req.user.id;

    try {
        await pool.query('BEGIN');

        // 1. Verify event and price
        const eventRes = await pool.query('SELECT price, organizer_id, title FROM events WHERE id = $1', [eventId]);
        if (eventRes.rows.length === 0) {
            throw new Error('Event not found');
        }

        const event = eventRes.rows[0];

        // Use the event price if amount not provided, or verify they match
        const paymentAmount = amount || event.price;

        // 2. Create Transaction (Escrow) with 10% Commission
        const payoutAt = new Date();
        payoutAt.setHours(payoutAt.getHours() + 24); // Schedule payout 24h from now

        const feeAmount = (paymentAmount * 0.10).toFixed(2);
        const netAmount = (paymentAmount - feeAmount).toFixed(2);

        const transRes = await pool.query(
            `INSERT INTO transactions (sender_id, recipient_id, event_id, amount, fee_amount, type, status, payout_at)
             VALUES ($1, $2, $3, $4, $5, 'payment', 'escrow', $6) RETURNING id`,
            [userId, event.organizer_id, eventId, paymentAmount, feeAmount, payoutAt]
        );

        // 3. Update Participant Status
        await pool.query(
            `UPDATE event_participants 
             SET payment_status = 'escrow', payment_amount = $1 
             WHERE event_id = $2 AND user_id = $3`,
            [paymentAmount, eventId, userId]
        );

        await pool.query('COMMIT');

        res.json({
            message: 'Payment received and held in escrow',
            transactionId: transRes.rows[0].id
        });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Payment error:', err);
        res.status(500).json({ error: err.message || 'Failed to process payment' });
    }
});

/**
 * NEW: Create a Stripe PaymentIntent
 * This initiates the payment flow with Stripe.
 */
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
    const { eventId } = req.body;
    const pool = req.app.get('db');

    try {
        // 1. Get event details to confirm price
        const eventRes = await pool.query('SELECT price, title FROM events WHERE id = $1', [eventId]);
        if (eventRes.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = eventRes.rows[0];
        const amountInCents = Math.round(parseFloat(event.price) * 100);

        if (amountInCents <= 0) {
            return res.status(400).json({ error: 'Free events do not require payment' });
        }

        // 2. Create the PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                eventId: eventId.toString(),
                userId: req.user.id.toString(),
                eventTitle: event.title
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        });
    } catch (error) {
        console.error('Stripe PaymentIntent Error:', error);
        res.status(500).json({ error: error.message || 'Failed to initialize payment' });
    }
});

/**
 * NEW: Organizer Stripe Onboarding
 * Generates a Stripe Account Link for the organizer.
 */
router.post('/onboard', authenticateToken, async (req, res) => {
    const pool = req.app.get('db');
    const userId = req.user.id;

    try {
        // 1. Check if user already has a stripe account
        const userRes = await pool.query('SELECT stripe_account_id FROM users WHERE id = $1', [userId]);
        let stripeAccountId = userRes.rows[0].stripe_account_id;

        if (!stripeAccountId) {
            // Create a new Express account
            const account = await stripe.accounts.create({
                type: 'express',
                metadata: { userId: userId.toString() }
            });
            stripeAccountId = account.id;

            await pool.query('UPDATE users SET stripe_account_id = $1 WHERE id = $2', [stripeAccountId, userId]);
        }

        // 2. Create an Account Link (URL for onboarding)
        // Fallback to a generic success URL if origin is missing
        const baseUrl = req.headers.origin || 'https://aceconnect.app';

        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${baseUrl}/onboarding-refresh`,
            return_url: `${baseUrl}/onboarding-success`,
            type: 'account_onboarding',
        });

        res.json({ url: accountLink.url });
    } catch (error) {
        console.error('CRITICAL: Stripe Onboarding Error Details:', {
            message: error.message,
            stack: error.stack,
            type: error.type,
            code: error.code
        });
        res.status(500).json({
            error: 'Failed to start onboarding',
            details: error.message
        });
    }
});

/**
 * NEW: Check Onboarding Status
 */
router.get('/onboard-status', authenticateToken, async (req, res) => {
    const pool = req.app.get('db');
    const userId = req.user.id;

    try {
        const userRes = await pool.query('SELECT stripe_account_id, stripe_onboarding_complete FROM users WHERE id = $1', [userId]);
        const { stripe_account_id, stripe_onboarding_complete } = userRes.rows[0];

        if (!stripe_account_id) {
            return res.json({ complete: false });
        }

        if (stripe_onboarding_complete) {
            return res.json({ complete: true });
        }

        // Check Stripe directly for real-time status
        const account = await stripe.accounts.retrieve(stripe_account_id);
        if (account.details_submitted) {
            await pool.query('UPDATE users SET stripe_onboarding_complete = TRUE WHERE id = $1', [userId]);
            return res.json({ complete: true });
        }

        res.json({ complete: false });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check status' });
    }
});

// Payout simulation (Release from escrow to organizer wallet)
router.post('/release-escrow', authenticateToken, async (req, res) => {
    const pool = req.app.get('db');
    const { transactionId } = req.body;

    try {
        await pool.query('BEGIN');

        // 1. Get transaction
        const transRes = await pool.query(
            'SELECT * FROM transactions WHERE id = $1 AND status = $2',
            [transactionId, 'escrow']
        );

        if (transRes.rows.length === 0) {
            throw new Error('Transaction not found or already released');
        }

        const trans = transRes.rows[0];

        // 2. Update Transaction
        await pool.query(
            "UPDATE transactions SET status = 'released', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [transactionId]
        );

        // 3. Update Organizer Wallet (Amount - Fee)
        const netAmount = trans.amount - (trans.fee_amount || 0);
        await pool.query(
            'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2',
            [netAmount, trans.recipient_id]
        );

        // 4. Update Participant status
        await pool.query(
            "UPDATE event_participants SET payment_status = 'released' WHERE event_id = $1 AND user_id = $2",
            [trans.event_id, trans.sender_id]
        );

        await pool.query('COMMIT');

        res.json({ message: 'Funds released to organizer wallet' });
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ error: err.message || 'Payout failed' });
    }
});

// Report dispute (Freeze escrow)
router.post('/report-scam', authenticateToken, async (req, res) => {
    const pool = req.app.get('db');
    const { eventId, reason } = req.body;
    const userId = req.user.id;

    try {
        await pool.query(
            "UPDATE transactions SET status = 'failed' WHERE event_id = $1 AND sender_id = $2 AND status = 'escrow'",
            [eventId, userId]
        );

        // Record the report
        await pool.query(
            'INSERT INTO user_reports (reporter_id, reported_id, reason, details) VALUES ($1, (SELECT organizer_id FROM events WHERE id = $2), $3, $4)',
            [userId, eventId, 'Payment Dispute', reason]
        );

        res.json({ message: 'Payout frozen. Support will review your report.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to report dispute' });
    }
});

/**
 * Webhook Handler for Stripe
 * This is called by Stripe when a payment state changes.
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const pool = req.app.get('db');
        const { eventId, userId } = paymentIntent.metadata;

        console.log(`Payment confirmed for Event ${eventId}, User ${userId}`);

        try {
            // We reuse the verify & record logic from /pay-event here
            // But ideally we'd extract this to a service. 
            // For now, let's trigger the escrow record.

            await pool.query('BEGIN');

            // 1. Get transaction info
            const eventRes = await pool.query('SELECT price, organizer_id FROM events WHERE id = $1', [eventId]);
            const eventData = eventRes.rows[0];
            const paymentAmount = paymentIntent.amount / 100;
            const feeAmount = (paymentAmount * 0.10).toFixed(2);

            // 2. Create Transaction (if not already exists - idempotency)
            const payoutAt = new Date();
            payoutAt.setHours(payoutAt.getHours() + 24);

            await pool.query(
                `INSERT INTO transactions (sender_id, recipient_id, event_id, amount, fee_amount, type, status, payout_at)
                 VALUES ($1, $2, $3, $4, $5, 'payment', 'escrow', $6)
                 ON CONFLICT DO NOTHING`,
                [userId, eventData.organizer_id, eventId, paymentAmount, feeAmount, payoutAt]
            );

            // 3. Update Participant Status
            await pool.query(
                `UPDATE event_participants 
                 SET payment_status = 'escrow', payment_amount = $1 
                 WHERE event_id = $2 AND user_id = $3`,
                [paymentAmount, eventId, userId]
            );

            await pool.query('COMMIT');
        } catch (err) {
            await pool.query('ROLLBACK');
            console.error('Webhook processing error:', err);
        }
    }

    res.send();
});

module.exports = router;
