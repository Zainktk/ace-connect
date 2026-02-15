const admin = require('firebase-admin');
const path = require('path');

class NotificationService {
    constructor() {
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;

        try {
            let serviceAccount;

            // Check for JSON string (production - Render)
            if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
                console.log('📱 Using Firebase credentials from FIREBASE_SERVICE_ACCOUNT_JSON');
            }
            // Check for file path (local development)
            else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
                const absolutePath = path.resolve(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
                serviceAccount = require(absolutePath);
                console.log('📁 Using Firebase credentials from file');
            }
            else {
                console.warn('⚠️  No Firebase credentials found. Push notifications disabled.');
                return;
            }

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });

            this.initialized = true;
            console.log('✅ Firebase Admin initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Firebase Admin:', error.message);
        }
    }

    async sendNotification(userId, title, body, data = {}) {
        if (!this.initialized) {
            console.log('Skipping notification (Firebase not initialized)');
            return false;
        }

        try {
            const pool = require('../server').pool; // Access pool from server
            const result = await pool.query('SELECT fcm_token FROM users WHERE id = $1', [userId]);

            if (!result.rows[0] || !result.rows[0].fcm_token) {
                console.log(`No FCM token for user ${userId}`);
                return false;
            }

            const token = result.rows[0].fcm_token;

            const message = {
                notification: {
                    title,
                    body
                },
                data,
                token
            };

            await admin.messaging().send(message);
            console.log(`✅ Notification sent to user ${userId}`);
            return true;
        } catch (error) {
            console.error('Failed to send notification:', error.message);
            return false;
        }
    }

    async sendMessageNotification(recipientId, senderName, messageContent) {
        return this.sendNotification(
            recipientId,
            `New message from ${senderName}`,
            messageContent,
            { type: 'message' }
        );
    }

    async sendInvitationNotification(recipientId, senderName) {
        return this.sendNotification(
            recipientId,
            'New Match Invitation',
            `${senderName} invited you to play!`,
            { type: 'invitation' }
        );
    }
}

module.exports = new NotificationService();
