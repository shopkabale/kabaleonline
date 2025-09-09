const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const algoliasearch = require("algoliasearch");

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
const algoliaClient = algoliasearch(
    process.env.ALGOLIA_APP_ID, 
    process.env.ALGOLIA_ADMIN_API_KEY // Use the ADMIN key for writing/syncing
);
const index = algoliaClient.initIndex('products'); // Make sure this matches your Algolia index name

exports.handler = async (event) => {
    try {
        const productsSnapshot = await db.collection('products').get();
        const algoliaObjects = productsSnapshot.docs.map(doc => {
            const data = doc.data();
            // Algolia requires a unique 'objectID' for each record.
            // Firestore's document ID is the perfect choice for this.
            return {
                objectID: doc.id, // This is a crucial field for Algolia
                name: data.name,
                name_lowercase: data.name_lowercase,
                description: data.description,
                category: data.category,
                price: data.price,
                listing_type: data.listing_type,
                sellerId: data.sellerId,
                sellerName: data.sellerName, // <-- Line added
                imageUrls: data.imageUrls,
                isSold: data.isSold || false, // <-- THE FIX IS HERE
                createdAt: data.createdAt ? data.createdAt.toMillis() : null // Convert Firestore Timestamp to milliseconds for Algolia
            };
        });

        // Save all product data to Algolia in a single batch
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
