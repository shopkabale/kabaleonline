const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Your Firebase Admin SDK configuration
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};

// Initialize Firebase App
if (!global._firebaseApp) {
    global._firebaseApp = initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

exports.handler = async (event, context) => {
    // Ensure the user is authenticated
    if (!context.clientContext.user) {
        return { statusCode: 401, body: "You must be logged in to place an order." };
    }

    try {
        const orderDetails = JSON.parse(event.body);
        const { buyerInfo, items } = orderDetails;

        // Group items by sellerId
        const ordersBySeller = {};
        items.forEach(item => {
            if (!ordersBySeller[item.sellerId]) {
                ordersBySeller[item.sellerId] = [];
            }
            ordersBySeller[item.sellerId].push(item);
        });

        const batch = db.batch();
        const ordersRef = db.collection('orders');

        // Create a separate order document for each seller
        for (const sellerId in ordersBySeller) {
            const sellerItems = ordersBySeller[sellerId];
            const sellerTotalPrice = sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

            const newOrderRef = ordersRef.doc(); // Auto-generate an ID for the new order
            batch.set(newOrderRef, {
                buyerInfo,
                sellerId,
                items: sellerItems,
                totalPrice: sellerTotalPrice,
                status: "Pending", // Initial status
                createdAt: FieldValue.serverTimestamp()
            });
        }
        
        // After creating orders, clear the user's cart
        const cartItemsRefs = items.map(item => db.collection('users').doc(buyerInfo.buyerId).collection('cart').doc(item.id));
        cartItemsRefs.forEach(ref => batch.delete(ref));
        
        // Commit all database operations at once
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