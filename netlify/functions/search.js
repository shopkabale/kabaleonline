const { initializeApp, cert } = require("firebase-admin/app");
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
const PRODUCTS_PER_PAGE = 30;

exports.handler = async (event) => {
    try {
        const { searchTerm, category, minPrice, maxPrice, lastVisible, type } = event.queryStringParameters;
        let query = db.collection("products");

        if (type) query = query.where("listing_type", "==", type);
        if (category) query = query.where("category", "==", category);
        if (minPrice) query = query.where("price", ">=", Number(minPrice));
        if (maxPrice) query = query.where("price", "<=", Number(maxPrice));

        // Use a single where clause for search term
        if (searchTerm) {
            query = query.where("name", "==", searchTerm);
        }

        // Always order by creation date for consistent pagination
        query = query.orderBy("createdAt", "desc");

        if (lastVisible) {
            const lastDoc = await db.collection("products").doc(lastVisible).get();
            if (lastDoc.exists) query = query.startAfter(lastDoc);
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
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch products." })};
    }
};
