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
    process.env.ALGOLIA_ADMIN_API_KEY
);

const productsIndex = algoliaClient.initIndex('products');
const eventsIndex = algoliaClient.initIndex('events'); 

exports.handler = async (event) => {
    try {
        if (event.httpMethod === 'POST' && event.body) {
            // (Your delete logic is preserved)
            const body = JSON.parse(event.body);
            if (body.action === 'delete' && body.objectID) {
                await productsIndex.deleteObject(body.objectID);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: `Product ${body.objectID} deleted from Algolia.` }),
                };
            }
        }
        
        // --- Sync Products (UPDATED) ---
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
                quantity: data.quantity,
                
                // All new fields:
                listing_type: data.listing_type,
                condition: data.condition,
                location: data.location,
                
                sellerId: data.sellerId,
                sellerName: data.sellerName,
                sellerIsVerified: data.sellerIsVerified || false,
                sellerBadges: data.badges || [],

                imageUrls: data.imageUrls,
                isSold: data.isSold || false,
                
                // Homepage fields:
                isDeal: data.isDeal || false,
                isSponsored: data.isSponsored || false,
                isSaveOnMore: data.isSaveOnMore || false,
                isHero: data.isHero || false,
                
                // Timestamp fields:
                createdAt: data.createdAt ? data.createdAt.toMillis() : Date.now(),
                heroTimestamp: data.heroTimestamp ? data.heroTimestamp.toMillis() : null
            };
        });
        await productsIndex.saveObjects(algoliaObjects);

        // --- Sync Events (Unchanged) ---
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