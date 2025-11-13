const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const Brevo = require('@getbrevo/brevo');

// Brevo API setup
const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.apiClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

// Firebase Admin SDK configuration
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};

if (!global._firebaseApp) {
    global._firebaseApp = initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// --- Helper: Log failed emails to Firestore (from your file) ---
async function logFailedNotification(db, error, emailDetails) {
    try {
        await db.collection('failed_notifications').add({
            ...emailDetails,
            error: error.message || "Unknown error",
            errorBody: error.response?.body || "No response body",
            timestamp: FieldValue.serverTimestamp()
        });
    } catch (logError) {
        console.error("CRITICAL: Failed to log notification failure:", logError);
    }
}

// --- Main Function Handler ---
exports.handler = async (event, context) => {
    const headers = { 'Content-Type': 'application/json' };

    // --- !! SECURITY !! ---
    const SECRET_KEY = "your_long_random_secret_key_12345"; // !! CHANGE THIS
    
    if (event.queryStringParameters.secret !== SECRET_KEY) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: "Unauthorized. You must provide the secret key." })
        };
    }

    let recipients = [];
    let emailObject = new Brevo.SendSmtpEmail(); 

    try {
        // 1. Fetch all users from your 'users' collection
        console.log("Fetching all users...");
        const snapshot = await db.collection('users').get();

        if (snapshot.empty) {
            return { statusCode: 200, headers, body: JSON.stringify({ message: "No users found to email." }) };
        }

        // 2. Build the recipient list for the batch send
        snapshot.forEach(doc => {
            const user = doc.data();
            if (user.email) {
                recipients.push({
                    email: user.email,
                    name: user.name || 'KabaleOnline Member' 
                });
            }
        });

        if (recipients.length === 0) {
            return { statusCode: 200, headers, body: JSON.stringify({ message: "No users had email addresses." }) };
        }
        
        // 3. Create the email object
        const LOGO_URL = "https://www.kabaleonline.com/icons/512.png"; // Your logo
        const emailSubject = `🎉 Festival Season Offer — Earn, Buy & Sell FREE on Kabale Online!`;

        emailObject.subject = emailSubject;
        emailObject.htmlContent = `
        <div style="margin: 0; padding: 0; width: 100%; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
                <tr>
                    <td align="center">
                        <table width="600" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                            <tr>
                                <td align="center" style="padding: 30px 20px 20px 20px;">
                                    <img src="${LOGO_URL}" alt="KabaleOnline Logo" width="160" style="max-width: 160px;">
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 0 40px 40px 40px;">
                                    <h1 style="font-size: 24px; color: #333; text-align: center; margin: 0 0 20px 0;">Hello, KabaleOnline Member!</h1>
                                    <p style="font-size: 16px; color: #555; line-height: 1.6; text-align: center;">
                                        Big news this festival season! 🌟
                                    </p>
                                    
                                    <ul style="font-size: 16px; color: #555; line-height: 1.6; text-align: left; padding-left: 30px; margin-top: 20px; margin-bottom: 20px;">
                                        <li style="margin-bottom: 10px;">✅ <strong>Sell for FREE</strong> — No fees, no charges!</li>
                                        <li style="margin-bottom: 10px;">✅ <strong>Fast Delivery</strong> — All deliveries across Kabale are fully covered.</li>
                                        <li style="margin-bottom: 10px;">✅ <strong>Referral Rewards</strong> — Earn real cash when friends sign up using your link!</li>
                                    </ul>
                                    
                                    <p style="font-size: 16px; color: #555; line-height: 1.6; text-align: center;">
                                        It’s the perfect time to buy, sell, and earn on Kabale Online.
                                    </D>

                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                        <tr>
                                            <td align="center" style="padding: 20px 0;">
                                                <a href="https://www.kabaleonline.com" target="_blank" style="background-color: #007aff; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                                                    Log in now to post items or get your referral link
                                                </a>
                                            </td>
                                        </tr>
                                    </table>

                                    <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">

                                    <p style="font-size: 14px; color: #777; text-align: center;">
                                        You’re receiving this message because you’re a registered member of Kabale Online.
                                        </p>
                                </td>
                            </tr>
                            <tr style="background-color: #fafafa; border-top: 1px solid #eeeeee;">
                                <td style="padding: 30px; text-align: center;">
                                    <p style="margin: 0; font-weight: bold; color: #555555; font-size: 16px;">
                                        #KabaleOnline_team
                                    </p>
                                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #888;">
                                        Your Local Marketplace — Made for You.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>
        `;
        
        emailObject.sender = { name: "Kabale Online", email: "support@kabaleonline.com" }; 
        emailObject.to = recipients; 
        emailObject.replyTo = { email: "support@kabaleonline.com" };
        emailObject.tags = ["marketing", "festival-offer"]; 

        // 4. Send the email blast
        console.log(`Sending email to ${recipients.length} users...`);
        const data = await apiInstance.sendTransacEmail(emailObject);
        console.log("Email batch sent successfully.", data);

        // 5. Report success
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: `Successfully sent email to ${recipients.length} users.`,
                success: true 
            })
        };

    } catch (error) {
        console.error('Error sending marketing blast:', error.response?.body || error);
        
        await logFailedNotification(db, error, {
            type: "marketing-blast-FAILURE",
            subject: emailObject.subject || "Subject not set",
            recipientCount: recipients.length || 0 
        });
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', details: error.message })
        };
    }
};