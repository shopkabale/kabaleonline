const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const algoliasearch = require("algoliasearch");

// Corrected: Decode the entire service account from the single environment variable
const serviceAccountString = Buffer.from(process.env.FIREBASE_ADMIN_SDK, 'base64').toString('utf8');
const serviceAccount = JSON.parse(serviceAccountString);

// Initialize Firebase App
if (!global._firebaseApp) {
    global._firebaseApp = initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// Initialize Algolia Client
const algoliaClient = algoliasearch(
    process.env.ALGOLIA_APP_ID, 
    process.env.ALGOLIA_ADMIN_API_KEY
);
const productsIndex = algoliaClient.initIndex('products');
const eventsIndex = algoliaClient.initIndex('events'); 

exports.handler = async (event) => {
    try {
        // ---- HANDLE SPECIFIC ACTIONS LIKE DELETE ----
        if (event.httpMethod === 'POST' && event.body) {
            const body = JSON.parse(event.body);

            // If the action is 'delete', remove the object from the products index
            if (body.action === 'delete' && body.objectID) {
                await productsIndex.deleteObject(body.objectID);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: `Product ${body.objectID} deleted from Algolia.` }),
                };
            }
        }
        
        // ---- IF NOT A SPECIFIC ACTION, RUN THE FULL SYNC ----
        
        // Sync Products
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

        // Sync Events
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
        await eventsIndex.saveObjects(algoliaEventObjects);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Full sync for Products and Events completed successfully." }),
        };
        
    } catch (error) {
        console.error("Algolia sync error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to sync data to Algolia." }),
        };
    }
};
