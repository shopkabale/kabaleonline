const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth"); // NEW: Import getAuth
const { getFirestore } = require("firebase-admin/firestore");

// Your Firebase Admin SDK configuration
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};

if (!global._firebaseApp) {
    global._firebaseApp = initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();
const authAdmin = getAuth(); // NEW: Initialize Admin Auth

exports.handler = async (event, context) => {
    // NEW: Manually verify the Firebase token from the request header
    const token = event.headers.authorization?.split('Bearer ')[1];

    if (!token) {
        return { 
            statusCode: 401, 
            body: JSON.stringify({ error: "No authentication token provided." }) 
        };
    }

    let decodedToken;
    try {
        decodedToken = await authAdmin.verifyIdToken(token);
    } catch (error) {
        console.error("Error verifying token:", error);
        return { 
            statusCode: 401, 
            body: JSON.stringify({ error: "Invalid or expired token." }) 
        };
    }

    // This is the secure, verified user ID
    const sellerId = decodedToken.uid;

    try {
        const ordersRef = db.collection('orders');
        
        const snapshot = await ordersRef.where('sellerId', '==', sellerId).orderBy('createdAt', 'desc').get();

        if (snapshot.empty) {
            return {
                statusCode: 200,
                body: JSON.stringify([]),
            };
        }

        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return {
            statusCode: 200,
            body: JSON.stringify(orders)
        };
    } catch (error) {
        console.error("Error fetching seller orders:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch orders." }),
        };
    }
};