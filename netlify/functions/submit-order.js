const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth"); // NEW: Import getAuth
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

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
const authAdmin = getAuth(); // NEW: Initialize Admin Auth

exports.handler = async (event, context) => {
    // NEW: Manually verify the Firebase token from the request header
    const token = event.headers.authorization?.split('Bearer ')[1];

    if (!token) {
        return { 
            statusCode: 401, 
            body: JSON.stringify({ error: "No authentication token provided." }) 
        };
    }

    let decodedToken;
    try {
        decodedToken = await authAdmin.verifyIdToken(token);
    } catch (error) {
        console.error("Error verifying token:", error);
        return { 
            statusCode: 401, 
            body: JSON.stringify({ error: "Invalid or expired token." }) 
        };
    }

    // This is the secure, verified user ID
    const buyerId = decodedToken.uid;

    try {
        const orderDetails = JSON.parse(event.body);
        const { buyerInfo, items } = orderDetails;

        // Add the secure buyerId to the buyerInfo object
        buyerInfo.buyerId = buyerId;

        const ordersBySeller = {};
        items.forEach(item => {
            if (!ordersBySeller[item.sellerId]) {
                ordersBySeller[item.sellerId] = [];
            }
            ordersBySeller[item.sellerId].push(item);
        });

        const batch = db.batch();
        const ordersRef = db.collection('orders');

        for (const sellerId in ordersBySeller) {
            const sellerItems = ordersBySeller[sellerId];
            const sellerTotalPrice = sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

            const newOrderRef = ordersRef.doc();
            batch.set(newOrderRef, {
                buyerInfo,
                sellerId,
                items: sellerItems,
                totalPrice: sellerTotalPrice,
                status: "Pending",
                createdAt: FieldValue.serverTimestamp()
            });
        }
        
        const cartItemsRefs = items.map(item => db.collection('users').doc(buyerId).collection('cart').doc(item.id));
        cartItemsRefs.forEach(ref => batch.delete(ref));
        
        await batch.commit();

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: "Order placed successfully!" }),
        };

    } catch (error) {
        console.error("Error creating order:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to place order." }),
        };
    }
};