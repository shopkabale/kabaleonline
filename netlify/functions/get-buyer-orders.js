const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};

if (!global._firebaseApp) {
    global._firebaseApp = initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();
const authAdmin = getAuth();

exports.handler = async (event, context) => {
    const token = event.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const buyerId = decodedToken.uid;

        const ordersRef = db.collection('orders');
        // This query finds orders where the buyer's ID is in the nested buyerInfo object
        const snapshot = await ordersRef.where('buyerInfo.buyerId', '==', buyerId).orderBy('createdAt', 'desc').get();

        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return { statusCode: 200, body: JSON.stringify(orders) };
    } catch (error) {
        console.error("Error fetching buyer orders:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch orders." }) };
    }
};