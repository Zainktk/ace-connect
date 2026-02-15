const https = require('https');
const nodemailer = require('nodemailer');

/**
 * Send OTP Email
 * Supports:
 * 1. Brevo HTTP API (Production - requires BREVO_API_KEY)
 * 2. Gmail/Nodemailer (Dev/Local - requires EMAIL_USER/EMAIL_PASS)
 * 
 * @param {string} to - Recipient email
 * @param {string} otp - 6-digit OTP code
 * @param {string} name - User's name
 */
const sendOTPEmail = async (to, otp, name) => {
    const brevoApiKey = process.env.BREVO_API_KEY; // Explicit Brevo Key
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailService = process.env.EMAIL_SERVICE;

    // --- STRATEGY 1: NODEMAILER (GMAIL/SMTP) ---
    // If we have Gmail creds but NO Brevo Key (or explicitly set to gmail), use Nodemailer.
    // This is what the user has locally.
    if (!brevoApiKey && emailUser && emailPass) {
        console.log('📧 Using Nodemailer (Gmail/SMTP)...');
        try {
            const transporter = nodemailer.createTransport({
                service: emailService || 'gmail',
                auth: {
                    user: emailUser,
                    pass: emailPass
                }
            });

            const mailOptions = {
                from: `"AceConnect" <${emailUser}>`,
                to: to,
                subject: 'AceConnect Verification Code',
                html: `
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
            };

            await transporter.sendMail(mailOptions);
            console.log(`✅ OTP email sent to ${to} via Nodemailer`);
            return true;
        } catch (error) {
            console.error('❌ Nodemailer Error:', error);
            return false;
        }
    }

    // --- STRATEGY 2: BREVO HTTP API (PRODUCTION) ---
    // If we have a Brevo API Key, use the HTTP API.
    if (brevoApiKey) {
        console.log('📧 Using Brevo HTTP API...');
        const data = JSON.stringify({
            sender: { name: "AceConnect", email: emailUser },
            to: [{ email: to, name: name }],
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
                'api-key': brevoApiKey,
                'content-type': 'application/json',
                'content-length': data.length
            },
            timeout: 10000
        };

        return new Promise((resolve) => {
            const req = https.request(options, (res) => {
                let responseBody = '';
                res.on('data', (chunk) => responseBody += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log(`✅ OTP email sent to ${to} via Brevo API`);
                        resolve(true);
                    } else {
                        console.error('❌ Brevo API Error:', res.statusCode, responseBody);
                        resolve(false);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ Request error to Brevo API:', error.message);
                resolve(false);
            });
            req.write(data);
            req.end();
        });
    }

    console.error('❌ Email configuration missing! Needs either BREVO_API_KEY (Prod) or EMAIL_USER/PASS (Dev).');
    return false;
};

module.exports = {
    sendOTPEmail,
};
