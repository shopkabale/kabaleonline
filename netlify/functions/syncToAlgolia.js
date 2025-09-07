const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const algoliasearch = require("algoliasearch");

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};

if (!global._firebaseApp) {
    global._firebaseApp = initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();
const algoliaClient = algoliasearch(
    process.env.ALGOLIA_APP_ID, 
    process.env.ALGOLIA_ADMIN_API_KEY // Use the ADMIN key for writing
);
const index = algoliaClient.initIndex('products'); // This name must match your Algolia index name

exports.handler = async (event) => {
    try {
        const productsSnapshot = await db.collection('products').get();
        const algoliaObjects = productsSnapshot.docs.map(doc => {
            const data = doc.data();
            // Algolia requires a unique 'objectID'. Firestore's document ID is perfect for this.
            return {
                objectID: doc.id,
                name: data.name,
                name_lowercase: data.name_lowercase,
                description: data.description,
                category: data.category,
                price: data.price,
                listing_type: data.listing_type,
                sellerId: data.sellerId,
                imageUrls: data.imageUrls,
                createdAt: data.createdAt ? data.createdAt.toMillis() : null // Algolia prefers timestamps as milliseconds
            };
        });

        // Save objects to Algolia, overwriting any previous data
        await index.saveObjects(algoliaObjects);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Data synced to Algolia successfully." }),
        };
    } catch (error) {
        console.error("Algolia sync error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to sync data to Algolia." }),
        };
    }
};
