const { initializeApp, cert } = require("firebase-admin/app");
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

exports.handler = async (event, context) => {
    // Securely get the seller's ID from the authenticated user token provided by Netlify
    const sellerId = context.clientContext.user?.uid;

    // If no user is logged in, deny access
    if (!sellerId) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: "You must be logged in to view orders." }),
        };
    }

    try {
        const ordersRef = db.collection('orders');
        
        // This is the key: A query that only finds orders matching the logged-in seller's ID
        const snapshot = await ordersRef.where('sellerId', '==', sellerId).orderBy('createdAt', 'desc').get();

        if (snapshot.empty) {
            return {
                statusCode: 200,
                body: JSON.stringify([]), // Return an empty array if no orders are found
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