const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Use your existing Firebase authentication method
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};

if (!global._firebaseApp) {
    global._firebaseApp = initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

exports.handler = async () => {
    try {
        const productsRef = db.collection('products');
        const snapshot = await productsRef.get();
        
        if (snapshot.empty) {
            return { statusCode: 200, body: "No products found to update." };
        }

        const batch = db.batch();
        let updatedCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            // This script only updates products that DO NOT have a 'quantity' field
            if (data.quantity === undefined) {
                const productRef = db.collection('products').doc(doc.id);
                batch.update(productRef, { quantity: 1 });
                updatedCount++;
            }
        });

        await batch.commit();

        return {
            statusCode: 200,
            body: `Operation complete. Updated ${updatedCount} products to have quantity: 1.`,
        };

    } catch (error) {
        console.error("Error updating products:", error);
        return { statusCode: 500, body: "An error occurred." };
    }
};