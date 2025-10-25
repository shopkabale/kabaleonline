// File Path: netlify/functions/product-lookup.js

const admin = require('firebase-admin');

// --- INITIALIZE FIREBASE ADMIN (FINAL CORRECTED VERSION) ---
try {
    // This check prevents the function from crashing on subsequent runs
    if (!admin.apps.length) {
        // This safely reads your three separate environment variables from Netlify
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // ⭐ THIS IS THE CRUCIAL FIX ⭐
            // This line correctly replaces the scrambled '\n' characters with real line breaks.
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          })
        });
    }
} catch (e) {
    console.error("Firebase admin initialization error:", e);
    // Throw an error to ensure the function stops if initialization fails
    throw new Error("Could not initialize Firebase Admin SDK.");
}

const db = admin.firestore();

// --- NETLIFY FUNCTION HANDLER ---
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { productName } = JSON.parse(event.body);
        if (!productName) {
            return { statusCode: 400, body: 'Product name is required.' };
        }

        // --- SEARCH LOGIC ---
        // This query finds products where the name starts with the search term.
        const productsRef = db.collection('products');
        // Capitalize first letter for better matching if your product names are capitalized
        const searchTerm = productName.charAt(0).toUpperCase() + productName.slice(1); 
        
        const snapshot = await productsRef
            .orderBy('name')
            .startAt(searchTerm)
            .endAt(searchTerm + '\uf8ff')
            .limit(3)
            .get();

        if (snapshot.empty) {
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    text: `🤔 I couldn't find any products matching "${productName}". You can try searching on the <a href="/shop/" target="_blank">shop page</a>.`
                }),
            };
        }

        // --- FORMAT THE RESPONSE ---
        let responseText = `Here's what I found for "${productName}":<ul>`;
        snapshot.forEach(doc => {
            const product = doc.data();
            const productId = doc.id;
            const price = product.price ? `UGX ${product.price.toLocaleString()}` : 'Price not set';
            
            responseText += `<li><b>${product.name}</b> - ${price}. <a href="/product.html?id=${productId}" target="_blank">View details</a>.</li>`;
        });
        responseText += `</ul>`;

        return {
            statusCode: 200,
            body: JSON.stringify({ text: responseText }),
        };

    } catch (error) {
        console.error("Product lookup error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ text: "Sorry, I ran into a database error. Please try again later." }),
        };
    }
};