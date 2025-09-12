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

// I've renamed 'index' to 'productsIndex' for clarity, but the functionality is identical.
const productsIndex = algoliaClient.initIndex('products');

// --- ADDED FOR EVENTS ---
// Initialize a new Algolia index for your events
const eventsIndex = algoliaClient.initIndex('events'); 
// ----------------------

exports.handler = async (event) => {
    try {
        // --- THIS IS YOUR EXISTING CODE FOR PRODUCTS (UNCHANGED) ---
        const productsSnapshot = await db.collection('products').get();
        const algoliaObjects = productsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                objectID: doc.id,
                name: data.name,
                name_lowercase: data.name_lowercase,
                description: data.description,
                category: data.category,
                price: data.price,
                listing_type: data.listing_type,
                sellerId: data.sellerId,
                sellerName: data.sellerName,
                imageUrls: data.imageUrls,
                isSold: data.isSold || false,
                createdAt: data.createdAt ? data.createdAt.toMillis() : null
            };
        });
        await productsIndex.saveObjects(algoliaObjects);
        // --- END OF EXISTING CODE ---


        // --- ADDED FOR EVENTS ---
        // Fetch all documents from the 'events' collection
        const eventsSnapshot = await db.collection('events').get();
        const algoliaEventObjects = eventsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                objectID: doc.id,
                title: data.title,
                description: data.description,
                location: data.location,
                date: data.date,
                price: data.price,
                imageUrl: data.imageUrl,
                uploaderId: data.uploaderId,
                createdAt: data.createdAt ? data.createdAt.toMillis() : null
            };
        });
        // Save all event data to the 'events' index in Algolia
        await eventsIndex.saveObjects(algoliaEventObjects);
        // ----------------------

        return {
            statusCode: 200,
            // Updated the success message slightly to reflect both collections
            body: JSON.stringify({ message: "Products and Events synced to Algolia successfully." }),
        };
    } catch (error) {
        console.error("Algolia sync error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to sync data to Algolia." }),
        };
    }
};
