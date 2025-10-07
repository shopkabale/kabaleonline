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
        
        // This transaction is now correctly structured
        await db.runTransaction(async (transaction) => {
            // --- ALL READS HAPPEN FIRST ---
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) {
                throw new Error("Order not found.");
            }

            const orderData = orderDoc.data();
            if (orderData.sellerId !== sellerId) {
                throw new Error("You are not authorized to update this order.");
            }
            
            // If the status is changing to 'Delivered', read all necessary product docs first
            const productRefs = [];
            const productDocs = [];
            if (newStatus === 'Delivered' && orderData.status !== 'Delivered') {
                for (const item of orderData.items) {
                    const productRef = db.collection('products').doc(item.id);
                    productRefs.push(productRef);
                    // Read each product doc and store the promise
                    productDocs.push(transaction.get(productRef));
                }
            }

            // Await all product reads
            const resolvedProductDocs = await Promise.all(productDocs);

            // --- ALL WRITES HAPPEN AFTER ---
            transaction.update(orderRef, { status: newStatus });
            
            // Now, perform the updates using the data we already read
            if (newStatus === 'Delivered' && orderData.status !== 'Delivered') {
                resolvedProductDocs.forEach((productDoc, index) => {
                    if (productDoc.exists) {
                        const currentQuantity = productDoc.data().quantity || 0;
                        const itemQuantity = orderData.items[index].quantity || 1;
                        const newQuantity = Math.max(0, currentQuantity - itemQuantity);
                        transaction.update(productRefs[index], { quantity: newQuantity });
                    }
                });
            }
        });

        return { statusCode: 200, body: JSON.stringify({ success: true, message: "Order status updated." }) };

    } catch (error) {
        console.error("Error updating order status:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};