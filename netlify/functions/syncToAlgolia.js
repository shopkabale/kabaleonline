// functions/syncToAlgolia.js
// This NEW, FAST version syncs ONE item at a time.

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

// --- Helper function to format data for Algolia ---
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
        service_duration: data.service_duration || '',
        service_location_type: data.service_location_type || '',
        service_availability: data.service_availability || '',
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
    // --- THIS IS THE OLD "FULL SYNC" LOGIC ---
    // We keep this in case you ever need to run it manually
    if (event.httpMethod === 'GET') {
        try {
            const productsSnapshot = await db.collection('products').get();
            const algoliaObjects = productsSnapshot.docs.map(formatProductForAlgolia);
            await productsIndex.saveObjects(algoliaObjects);
            
            // Note: We are no longer syncing 'events' here to keep it fast
            
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Full sync for Products completed." }),
            };
        } catch (error) {
            console.error("Full Algolia sync error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Failed to run full sync." }),
            };
        }
    }

    // --- THIS IS THE NEW "SINGLE ITEM SYNC" LOGIC ---
    if (event.httpMethod === 'POST') {
        try {
            const body = JSON.parse(event.body);
            const { action, objectID } = body;

            if (!action || !objectID) {
                return { statusCode: 400, body: 'Missing "action" or "objectID"' };
            }

            if (action === 'delete') {
                // --- Handle DELETE ---
                await productsIndex.deleteObject(objectID);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: `Product ${objectID} deleted from Algolia.` }),
                };

            } else if (action === 'update') {
                // --- Handle UPDATE or CREATE ---
                const productDoc = await db.collection('products').doc(objectID).get();
                if (!productDoc.exists) {
                    return { statusCode: 404, body: 'Product not found in Firestore' };
                }
                
                const algoliaObject = formatProductForAlgolia(productDoc);
                await productsIndex.saveObject(algoliaObject);
                
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: `Product ${objectID} saved to Algolia.` }),
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