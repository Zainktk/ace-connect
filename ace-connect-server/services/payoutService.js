/**
 * PayoutService.js
 * Handles releasing funds from escrow to organizer wallets 24h after events.
 */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PayoutService {
    constructor(pool) {
        this.pool = pool;
    }

    /**
     * Runs the payout cycle.
     * Finds all 'escrow' transactions where payout_at is in the past and status is not 'failed'.
     */
    async processScheduledPayouts() {
        console.log('[PayoutService] Checking for scheduled payouts...');
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Find eligible transactions and their recipients' Stripe IDs
            const result = await client.query(
                `SELECT t.*, u.stripe_account_id, u.stripe_onboarding_complete 
                 FROM transactions t
                 JOIN users u ON t.recipient_id = u.id
                 WHERE t.status = 'escrow' 
                 AND t.payout_at <= CURRENT_TIMESTAMP
                 FOR UPDATE`
            );

            if (result.rows.length === 0) {
                console.log('[PayoutService] No payouts due.');
                await client.query('COMMIT');
                return;
            }

            console.log(`[PayoutService] Processing ${result.rows.length} payouts...`);

            for (const trans of result.rows) {
                try {
                    const netPayout = trans.amount - (trans.fee_amount || 0);
                    const netPayoutCents = Math.round(netPayout * 100);

                    // If they have Stripe connected, move REAL money
                    if (trans.stripe_account_id && trans.stripe_onboarding_complete) {
                        console.log(`[PayoutService] Initiating Stripe Transfer for $${netPayout} to ${trans.stripe_account_id}`);
                        await stripe.transfers.create({
                            amount: netPayoutCents,
                            currency: 'usd',
                            destination: trans.stripe_account_id,
                            description: `Payout for event: ${trans.event_id}`,
                            metadata: { transactionId: trans.id.toString() }
                        });
                    }

                    // Update Transaction
                    await client.query(
                        "UPDATE transactions SET status = 'released', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                        [trans.id]
                    );

                    // Update Organizer Balance (Internal wallet)
                    await client.query(
                        "UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2",
                        [netPayout, trans.recipient_id]
                    );

                    // Update Participant Status
                    await client.query(
                        "UPDATE event_participants SET payment_status = 'released' WHERE event_id = $1 AND user_id = $2",
                        [trans.event_id, trans.sender_id]
                    );

                    console.log(`[PayoutService] Released $${netPayout} for Transaction ID: ${trans.id}`);
                } catch (transErr) {
                    console.error(`[PayoutService] Failed to process transaction ${trans.id}:`, transErr);
                }
            }

            await client.query('COMMIT');
            console.log('[PayoutService] Payout cycle completed.');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[PayoutService] Error in payout cycle:', error);
        } finally {
            client.release();
        }
    }

    /**
     * Starts the background job to check for payouts every hour.
     */
    start() {
        // Check every hour
        this.interval = setInterval(() => {
            this.processScheduledPayouts();
        }, 3600000);

        // Run once on start
        this.processScheduledPayouts();
    }
}

module.exports = PayoutService;
