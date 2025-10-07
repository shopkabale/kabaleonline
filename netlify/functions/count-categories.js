const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Your Firebase Admin SDK configuration
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};

// Initialize Firebase App
if (!global._firebaseApp) {
    global._firebaseApp = initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

exports.handler = async () => {
    try {
        // MODIFIED: Fetch all products, including sold ones
        const productsRef = db.collection('products');
        const snapshot = await productsRef.get(); // ".where()" clause removed

        const counts = {
            'Electronics': 0,
            'Clothing & Apparel': 0,
            'Home & Furniture': 0,
            'Other': 0
        };

        snapshot.forEach(doc => {
            const category = doc.data().category;
            if (category in counts) {
                counts[category]++;
            }
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
            },
            body: JSON.stringify(counts),
        };
    } catch (error) {
        console.error("Error counting categories:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not fetch category counts." }),
        };
    }
};