const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

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
const authAdmin = getAuth();

exports.handler = async (event, context) => {
    const token = event.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const sellerId = decodedToken.uid;
        
        const { orderId, newStatus } = JSON.parse(event.body);

        if (!orderId || !newStatus) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing orderId or newStatus." }) };
        }

        const orderRef = db.collection('orders').doc(orderId);
        
        // This transaction now correctly performs all reads before any writes.
        await db.runTransaction(async (transaction) => {
            // --- READ PHASE ---
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) {
                throw new Error("Order not found.");
            }

            const orderData = orderDoc.data();
            // Security check
            if (orderData.sellerId !== sellerId) {
                throw new Error("You are not authorized to update this order.");
            }
            
            // --- WRITE PHASE ---
            // 1. Update the order status
            transaction.update(orderRef, { status: newStatus });
            
            // 2. If status is 'Delivered', update product quantities
            if (newStatus === 'Delivered' && orderData.status !== 'Delivered') {
                for (const item of orderData.items) {
                    const productRef = db.collection('products').doc(item.id);
                    // You must read the product *inside* the transaction before updating it.
                    const productDoc = await transaction.get(productRef); 
                    if (productDoc.exists) {
                        const currentQuantity = productDoc.data().quantity || 0;
                        const newQuantity = Math.max(0, currentQuantity - (item.quantity || 1));
                        // This write happens after the read, which is valid.
                        transaction.update(productRef, { quantity: newQuantity });
                    }
                }
            }
        });

        return { statusCode: 200, body: JSON.stringify({ success: true, message: "Order status updated." }) };

    } catch (error) {
        console.error("Error updating order status:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};