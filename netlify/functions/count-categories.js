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
        // --- Count Products (including sold ones) ---
        const productsRef = db.collection('products');
        const productsSnapshot = await productsRef.get(); // Corrected: Fetches ALL products
        const productCounts = {
            'Electronics': 0,
            'Clothing & Apparel': 0,
            'Home & Furniture': 0,
            'Other': 0
        };
        productsSnapshot.forEach(doc => {
            const category = doc.data().category;
            if (category in productCounts) {
                productCounts[category]++;
            }
        });

        // --- Count Rentals ---
        const rentalsRef = db.collection('rentals');
        const rentalsSnapshot = await rentalsRef.count().get();
        const rentalsCount = rentalsSnapshot.data().count;

        // --- Count Services ---
        const servicesRef = db.collection('services');
        const servicesSnapshot = await servicesRef.count().get();
        const servicesCount = servicesSnapshot.data().count;

        // --- Combine all counts into a single object ---
        const allCounts = {
            ...productCounts,
            'Rentals': rentalsCount,
            'Services': servicesCount
        };

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
            },
            body: JSON.stringify(allCounts),
        };
    } catch (error) {
        console.error("Error counting categories:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not fetch category counts." }),
        };
    }
};