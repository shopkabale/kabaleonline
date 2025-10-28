// File Path: /netlify/functions/auth-magic-link.js
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
    }),
  });
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    try {
        const { email } = JSON.parse(event.body);
        if (!email) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Email is required.' }) };
        }
        const actionCodeSettings = {
            url: 'https://kabaleonline.com/dashboard/',
            handleCodeInApp: true,
        };
        const link = await admin.auth().generateSignInWithEmailLink(email, actionCodeSettings);
        await transporter.sendMail({
            from: `"KabaleOnline Support" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Your Secure Login Link for KabaleOnline',
            html: `<p>Hello,</p><p>Click the link below to securely sign in to your KabaleOnline account.</p><p><a href="${link}"><b>Sign In to KabaleOnline</b></a></p><p>If you did not request this, you can safely ignore this email.</p>`,
        });
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (error) {
        console.error("Magic link error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send login link.' }) };
    }
};