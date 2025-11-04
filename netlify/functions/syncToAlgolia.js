// functions/syncToAlgolia.js
// This function handles BOTH:
// 1. GET requests (for a full, manual sync)
// 2. POST requests (for a fast, single-item sync)

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const algoliasearch = require("algoliasearch");

// --- Firebase Admin SDK config ---
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};

if (!global._firebaseApp) {
    global._firebaseApp = initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// --- Algolia Client config ---
const algoliaClient = algoliasearch(
    process.env.ALGOLIA_APP_ID, 
    process.env.ALGOLIA_ADMIN_API_KEY
);
const productsIndex = algoliaClient.initIndex('products');

// --- Helper function to format ALL data for Algolia ---
// This is the function you wanted updated. It now includes *all* fields.
function formatProductForAlgolia(doc) {
    const data = doc.data();
    return {
        objectID: doc.id,
        name: data.name,
        name_lowercase: data.name_lowercase,
        description: data.description,
        category: data.category,
        price: data.price,
        quantity: data.quantity,
        listing_type: data.listing_type,
        condition: data.condition,
        location: data.location,
        
        // --- NEW SERVICE FIELDS ---
        service_duration: data.service_duration || '',
        service_location_type: data.service_location_type || '',
        service_availability: data.service_availability || '',
        // --- END NEW FIELDS ---

        sellerId: data.sellerId,
        sellerName: data.sellerName,
        sellerIsVerified: data.sellerIsVerified || false,
        sellerBadges: data.badges || [],
        imageUrls: data.imageUrls,
        isSold: data.isSold || false,
        isDeal: data.isDeal || false,
        isSponsored: data.isSponsored || false,
        isSaveOnMore: data.isSaveOnMore || false,
        isHero: data.isHero || false,
        createdAt: data.createdAt ? data.createdAt.toMillis() : Date.now(),
        heroTimestamp: data.heroTimestamp ? data.heroTimestamp.toMillis() : null
    };
}

// --- Main Function Handler ---
exports.handler = async (event) => {
    
    // --- THIS IS THE "FULL SYNC" for manual runs ---
    // Visiting the URL in your browser triggers this GET request.
    if (event.httpMethod === 'GET') {
        try {
            console.log("Starting FULL manual sync...");
            const productsSnapshot = await db.collection('products').get();
            const algoliaObjects = productsSnapshot.docs.map(formatProductForAlgolia);
            
            await productsIndex.saveObjects(algoliaObjects);
            console.log(`SUCCESS: Synced ${algoliaObjects.length} products.`);
            
            return {
                statusCode: 200,
                body: JSON.stringify({ message: `Full sync completed. ${algoliaObjects.length} products synced.` }),
            };
        } catch (error) {
            console.error("Full Algolia sync error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Failed to run full sync." }),
            };
        }
    }

    // --- THIS IS THE "SINGLE ITEM SYNC" for uploads/edits ---
    if (event.httpMethod === 'POST') {
        try {
            const body = JSON.parse(event.body);
            const { action, objectID } = body;

            if (!action || !objectID) {
                return { statusCode: 400, body: 'Missing "action" or "objectID"' };
            }

            if (action === 'delete') {
                await productsIndex.deleteObject(objectID);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: `Product ${objectID} deleted.` }),
                };

            } else if (action === 'update') {
                const productDoc = await db.collection('products').doc(objectID).get();
                if (!productDoc.exists) {
                    return { statusCode: 404, body: 'Product not found in Firestore' };
                }
                
                const algoliaObject = formatProductForAlgolia(productDoc);
                await productsIndex.saveObject(algoliaObject);
                
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: `Product ${objectID} saved.` }),
                };
            }
            
            return { statusCode: 400, body: 'Invalid action.' };

        } catch (error) {
            console.error("Algolia sync error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Failed to sync data to Algolia." }),
            };
        }
    }
    
    return { statusCode: 405, body: 'Method Not Allowed (Only GET or POST)' };
};