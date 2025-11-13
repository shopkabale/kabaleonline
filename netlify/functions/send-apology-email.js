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

// --- Helper: Log failed emails to Firestore ---
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
    const SECRET_KEY = "your_new_secret_key_for_this_email"; // !! CHANGE THIS
    
    if (event.queryStringParameters.secret !== SECRET_KEY) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: "Unauthorized. You must provide the secret key." })
        };
    }

    let allRecipients = [];
    let subject = `An Important Security Update and Apology from Kabale Online`;

    try {
        // 1. Fetch all users
        console.log("Fetching all users...");
        const snapshot = await db.collection('users').get();
        snapshot.forEach(doc => {
            const user = doc.data();
            if (user.email) {
                allRecipients.push({
                    email: user.email,
                    name: user.name || 'KabaleOnline Member' 
                });
            }
        });

        if (allRecipients.length === 0) {
            return { statusCode: 200, headers, body: JSON.stringify({ message: "No users had email addresses." }) };
        }
        
        // 3. Define the Email Template
        const LOGO_URL = "https://www.kabaleonline.com/icons/512.png";
        const HTML_CONTENT = `
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
                                    <h1 style="font-size: 24px; color: #333; text-align: center; margin: 0 0 20px 0;">An Important Security Update</h1>
                                    <p style="font-size: 16px; color: #555; line-height: 1.6;">Hello KabaleOnline Member,</p>
                                    <p style="font-size: 16px; color: #555; line-height: 1.6;">Earlier today, we sent you a marketing email for our new festival offer.</p>
                                    <p style="font-size: 16px; color: #555; line-height: 1.6;">In doing so, we made a critical technical error. The email was sent in a way that accidentally made the recipient list (including your email address) visible to all other recipients. This is a data breach, and it is a complete failure on our part.</p>
                                    <p style="font-size: 16px; color: #555; line-height: 1.6;">One of the recipients on that list has already abused this by sending their own spam advertising. We are so sorry.</p>
                                    <p style="font-size: 16px; color: #555; line-height: 1.6;">We have permanently deleted the faulty code, fixed the vulnerability, and banned the user who sent the spam.</p>
                                    <p style="font-size: 16px; color: #555; line-height: 1.6;">Your trust is the most important thing to us, and we have failed you. We are deeply sorry for this mistake.</p>

                                    <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">
                                    <h2 style="font-size: 20px; color: #333; text-align: center;">Important Security Advice</h2>
                                    <p style="font-size: 16px; color: #555; line-height: 1.6; text-align: center;">
                                        To protect yourself, please **report the spam email** you received from "Campus Mart" as spam or junk in your email app.
                                    </p>
                                    <p style="font-size: 16px; color: #555; line-height: 1.6; text-align: center; font-weight: bold; padding: 10px; background-color: #fffbeb;">
                                        Always check the sender. Our *only* official email address is <strong>support@kabaleonline.com</strong>. If you receive an email from any other address, please do not trust it.
                                    </p>
                                    <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">
                                    <p style="font-size: 16px; color: #555; line-height: 1.6;">— The Kabale Online Team</p>
                                    
                                    <p style="font-size: 14px; color: #777; text-align: center; margin-top: 20px;">
                                        You are receiving this security update because you are a registered member.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>
        `;

        // --- *** COMBINED FIX: BATCHING + BCC *** ---
        // 4. Set chunk size and create promise array
        const CHUNK_SIZE = 50; // A safe batch size (well below 99)
        const emailPromises = [];

        console.log(`Total recipients: ${allRecipients.length}. Splitting into chunks of ${CHUNK_SIZE}...`);

        // 5. Loop through the recipients and create a new API call for each chunk
        for (let i = 0; i < allRecipients.length; i += CHUNK_SIZE) {
            const chunk = allRecipients.slice(i, i + CHUNK_SIZE);
            
            console.log(`Preparing chunk ${Math.floor(i / CHUNK_SIZE) + 1} with ${chunk.length} recipients...`);
            
            // Create a new email object for this specific chunk
            const emailObject = new Brevo.SendSmtpEmail();
            emailObject.subject = subject;
            emailObject.htmlContent = HTML_CONTENT;
            emailObject.sender = { name: "Kabale Online", email: "support@kabaleonline.com" }; 
            emailObject.replyTo = { email: "support@kabaleonline.com" };
            emailObject.tags = ["security-apology", "v3"]; 

            // THIS IS THE SECURE PART:
            emailObject.to = [{ email: "support@kabaleonline.com", name: "Kabale Online Admin" }];
            emailObject.bcc = chunk; // Put this chunk (e.g., 50 recipients) in BCC

            // Add the API call to the list of promises
            emailPromises.push(apiInstance.sendTransacEmail(emailObject));
        }

        // 6. Send all chunks in parallel
        console.log(`Sending ${emailPromises.length} email batches (privately via BCC)...`);
        const results = await Promise.allSettled(emailPromises);

        // 7. Check results
        let failedChunks = 0;
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`Email chunk ${index + 1} FAILED:`, result.reason.response?.body || result.reason);
                failedChunks++;
            }
        });

        if (failedChunks > 0) {
            throw new Error(`${failedChunks} out of ${emailPromises.length} email batches failed.`);
        }
        
        console.log("All email batches sent successfully!");
        // --- *** END OF COMBINED FIX *** ---
        

        // 8. Report success
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: `Successfully sent apology email to ${allRecipients.length} users in ${emailPromises.length} batches (via BCC).`,
                success: true 
            })
        };

    } catch (error) {
        console.error('Error sending apology email:', error.response?.body || error);
        
        await logFailedNotification(db, error, {
            type: "apology-email-FAILURE",
            subject: subject,
            recipientCount: allRecipients.length 
        });
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', details: error.message })
        };
    }
};