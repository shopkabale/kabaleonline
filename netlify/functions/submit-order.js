const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
// --- NEW (Brevo) ---
const Brevo = require('@getbrevo/brevo');

// --- NEW (Brevo API setup) ---
// 1. Configure the Brevo API client
const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.apiClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

// 2. Create a reusable email object
const sendSmtpEmail = new Brevo.SendSmtpEmail();

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
    // Manually verify the Firebase token
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
        const { buyerInfo, items, totalPrice } = orderDetails;

        // Add the secure buyerId to the buyerInfo object
        buyerInfo.buyerId = buyerId;

        const ordersBySeller = {};
        items.forEach(item => {
            if (!ordersBySeller[item.sellerId]) {
                ordersBySeller[item.sellerId] = [];
            }
            ordersBySeller[item.sellerId].push(item);
        });

        // Get all seller emails in parallel
        const sellerIds = Object.keys(ordersBySeller);
        const sellerDocPromises = sellerIds.map(id => db.collection('users').doc(id).get());
        const sellerDocsSnapshots = await Promise.all(sellerDocPromises);
        
        const sellerEmailMap = new Map();
        sellerDocsSnapshots.forEach(doc => {
            if (doc.exists) {
                // Assumes email is stored on the user's document
                sellerEmailMap.set(doc.id, doc.data().email); 
            }
        });

        // Save the order to Firestore
        const batch = db.batch();
        const ordersRef = db.collection('orders');
        const newOrderIds = []; 

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
            newOrderIds.push(newOrderRef.id);
        }

        // Delete items from cart
        const cartItemsRefs = items.map(item => db.collection('users').doc(buyerId).collection('cart').doc(item.id));
        cartItemsRefs.forEach(ref => batch.delete(ref));

        await batch.commit();

        // --- Send all notifications (after batch is successful) ---
        const notificationPromises = [];

        // Promise for Admin Email (with all items)
        notificationPromises.push(
            sendAdminNotification(apiInstance, sendSmtpEmail, buyerInfo, items, totalPrice, newOrderIds)
        );

        // Promises for Seller Emails (one for each seller)
        for (const sellerId of sellerIds) {
            const sellerEmail = sellerEmailMap.get(sellerId);
            if (sellerEmail) {
                const sellerItems = ordersBySeller[sellerId];
                const sellerTotalPrice = sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
                
                notificationPromises.push(
                    sendSellerNotification(apiInstance, sendSmtpEmail, sellerEmail, buyerInfo, sellerItems, sellerTotalPrice)
                );
            } else {
                console.warn(`No email found for sellerId: ${sellerId}. Cannot notify.`);
            }
        }

        // Wait for all emails to be sent
        await Promise.allSettled(notificationPromises);

        // Return success to the user
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

// --- Helper function to send the ADMIN email ---
async function sendAdminNotification(apiInstance, emailObject, buyerInfo, allItems, grandTotal, orderIds) {
    const itemHtml = allItems.map(item => 
        `<li>${item.name} (Qty: ${item.quantity}) - UGX ${item.price.toLocaleString()} (Seller: ${item.sellerId})</li>`
    ).join('');
    
    // Set properties for this specific email
    emailObject.subject = `🎉 New Master Order! Total: UGX ${grandTotal.toLocaleString()}`;
    emailObject.htmlContent = `
        <h1>You have a new order!</h1>
        <p><strong>Grand Total:</strong> UGX ${grandTotal.toLocaleString()}</p>
        <p><strong>Firestore Order IDs:</strong> ${orderIds.join(', ')}</p>
        <hr>
        <h3>Buyer Details:</h3>
        <p><strong>Name:</strong> ${buyerInfo.name}</p>
        <p><strong>Phone:</strong> ${buyerInfo.phone}</p>
        <p><strong>Location:</strong> ${buyerInfo.location}</p>
        <hr>
        <h3>All Items in this Order:</h3>
        <ul>${itemHtml}</ul>
    `;
    emailObject.sender = { name: "KabaleOnline Admin", email: "support@kabaleonline.com" };
    emailObject.to = [{ email: "shopkabale@gmail.com" }]; // <-- YOUR ADMIN EMAIL
    emailObject.replyTo = { email: "support@kabaleonline.com" };

    try {
        await apiInstance.sendTransacEmail(emailObject);
        console.log('Admin notification sent.');
    } catch (error) {
        console.error('Error sending admin email:', error.response?.body);
    }
}

// --- Helper function to send a SELLER email ---
async function sendSellerNotification(apiInstance, emailObject, sellerEmail, buyerInfo, sellerItems, sellerTotalPrice) {
    const itemHtml = sellerItems.map(item => 
        `<li>${item.name} (Qty: ${item.quantity}) - UGX ${item.price.toLocaleString()}</li>`
    ).join('');

    // Set properties for this specific email
    emailObject.subject = `🎉 You have a new order on KabaleOnline!`;
    emailObject.htmlContent = `
        <h1>You've made a sale!</h1>
        <p>A customer has ordered your item(s). Please prepare them for delivery.</p>
        <p><strong>Your total for this part of the order:</strong> UGX ${sellerTotalPrice.toLocaleString()}</p>
        <hr>
        <h3>Items to Prepare:</h3>
        <ul>${itemHtml}</ul>
        <hr>
        <h3>Buyer Delivery Info:</h3>
        <p><strong>Name:</strong> ${buyerInfo.name}</p>
        <p><strong>Phone:</strong> ${buyerInfo.phone}</p>
        <p><strong>Location:</strong> ${buyerInfo.location}</p>
        <br>
        <p>An admin from KabaleOnline will contact you soon to coordinate pickup and payment.</p>
    `;
    emailObject.sender = { name: "KabaleOnline", email: "support@kabaleonline.com" };
    emailObject.to = [{ email: sellerEmail }]; // The seller's email
    emailObject.replyTo = { email: "support@kabaleonline.com" };

    try {
        await apiInstance.sendTransacEmail(emailObject);
        console.log(`Seller notification sent to: ${sellerEmail}`);
    } catch (error) {
        console.error(`Error sending seller email to ${sellerEmail}:`, error.response?.body);
    }
}