// Filename: functions/user-listings.js (Corrected for Base64 Env Var)

const admin = require('firebase-admin');

// --- INITIALIZATION ---
// This ensures Firebase Admin is initialized only once.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // --- THIS IS THE CRITICAL FIX ---
        // Decodes the Base64 private key from your Netlify environment variables.
        privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
      }),
    });
  } catch (error) {
    console.error("Firebase admin initialization error:", error);
  }
}

const db = admin.firestore();

// --- NETLIFY FUNCTION HANDLER ---
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // --- SECURE AUTHENTICATION ---
    const token = event.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: No token provided.' }) };
    }

    let decodedToken;
    try {
        decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
        console.error("Token verification error:", error);
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: Invalid token.' }) };
    }

    const userId = decodedToken.uid;

    try {
        const listingsSnapshot = await db.collection('products').where('sellerId', '==', userId).orderBy('createdAt', 'desc').get();

        if (listingsSnapshot.empty) {
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    text: "You don't have any active listings right now.",
                    suggestions: ["Sell an item"]
                }),
            };
        }

        let responseText = `Here are your active listings:<ul>`;
        listingsSnapshot.forEach(doc => {
            const product = doc.data();
            const price = product.price ? `UGX ${product.price.toLocaleString()}` : 'Price not set';
            responseText += `<li><b>${product.name}</b> - ${price}. <a href="/product.html?id=${doc.id}" target="_blank">View</a> | <a href="/upload/?editId=${doc.id}" target="_blank">Edit</a>.</li>`;
        });
        responseText += `</ul>`;
        
        return {
            statusCode: 200,
            body: JSON.stringify({ text: responseText }),
        };

    } catch (error) {
        console.error("Firestore query error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch user listings." }),
        };
    }
};