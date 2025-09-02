const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize Firebase Admin SDK
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Ensure your private key is correctly formatted in Netlify environment variables
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
};

// Prevent re-initialization on hot reloads
if (!global._firebaseApp) {
    global._firebaseApp = initializeApp({
        credential: cert(serviceAccount)
    });
}

const db = getFirestore();
const PRODUCTS_PER_PAGE = 30;

exports.handler = async (event) => {
    try {
        const { searchTerm, category, minPrice, maxPrice, lastVisible } = event.queryStringParameters;
        
        let query = db.collection("products");

        // Apply filters
        if (category) {
            query = query.where("category", "==", category);
        }
        if (minPrice) {
            query = query.where("price", ">=", Number(minPrice));
        }
        if (maxPrice) {
            query = query.where("price", "<=", Number(maxPrice));
        }
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            query = query.where("name_lowercase", ">=", lowercasedTerm)
                         .where("name_lowercase", "<=", lowercasedTerm + '\uf8ff');
        }

        // Apply ordering - important for consistent pagination
        // NOTE: If you combine range filters on different fields (e.g., price and name), 
        // Firestore requires you to order by one of them. We'll order by creation date.
        // If you see errors about indexes, Firestore will provide a link to create it.
        query = query.orderBy("createdAt", "desc");

        // Handle pagination
        if (lastVisible) {
            const lastDoc = await db.collection("products").doc(lastVisible).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }
        
        query = query.limit(PRODUCTS_PER_PAGE);

        const snapshot = await query.get();
        
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(products),
        };

    } catch (error) {
        console.error("Search function error:", error);
        const errorMessage = error.message.includes("indexes")
            ? "Query requires a Firestore index. Please check your Firebase console for an automatic index creation link."
            : "Failed to fetch products.";

        return {
            statusCode: 500,
            body: JSON.stringify({ error: errorMessage, details: error.message }),
        };
    }
};
