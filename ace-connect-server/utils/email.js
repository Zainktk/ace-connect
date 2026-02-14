const https = require('https');

/**
 * Send OTP Email via Brevo HTTP API
 * @param {string} to - Recipient email
 * @param {string} otp - 6-digit OTP code
 * @param {string} name - User's name
 */
const sendOTPEmail = async (to, otp, name) => {
    const apiKey = process.env.EMAIL_PASS;
    const senderEmail = process.env.EMAIL_USER;

    if (!apiKey || !senderEmail) {
        console.error('Email configuration missing (EMAIL_PASS or EMAIL_USER)');
        return false;
    }

    const data = JSON.stringify({
        sender: {
            name: "AceConnect",
            email: senderEmail
        },
        to: [
            {
                email: to,
                name: name
            }
        ],
        subject: "AceConnect Verification Code",
        htmlContent: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #4CAF50;">AceConnect Verification</h2>
                <p>Hello <strong>${name}</strong>,</p>
                <p>Welcome to AceConnect! Your verification code is:</p>
                <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 20px 0;">
                    ${otp}
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p>If you did not request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;">
                <p style="font-size: 12px; color: #888;">This is an automated message, please do not reply.</p>
            </div>
        `
    });

    const options = {
        hostname: 'api.brevo.com',
        port: 443,
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json',
            'content-length': data.length
        },
        timeout: 10000 // 10 seconds timeout
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`OTP email sent successfully to ${to} via Brevo API`);
                    resolve(true);
                } else {
                    console.error('Brevo API Error:', res.statusCode, responseBody);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Request error to Brevo API:', error.message);
            resolve(false);
        });

        req.on('timeout', () => {
            req.destroy();
            console.error('Brevo API request timed out');
            resolve(false);
        });

        req.write(data);
        req.end();
    });
};

module.exports = {
    sendOTPEmail,
};
