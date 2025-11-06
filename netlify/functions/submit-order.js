const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const Brevo = require('@getbrevo/brevo');

// Brevo API setup
const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.apiClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

// Firebase Admin SDK configuration
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
        return { statusCode: 401, body: JSON.stringify({ error: "No authentication token provided." }) };
    }

    let decodedToken;
    try {
        decodedToken = await authAdmin.verifyIdToken(token);
    } catch (error) {
        console.error("Error verifying token:", error);
        return { statusCode: 401, body: JSON.stringify({ error: "Invalid or expired token." }) };
    }

    const buyerId = decodedToken.uid;

    try {
        const orderDetails = JSON.parse(event.body);
        const { buyerInfo, items, totalPrice } = orderDetails;
        buyerInfo.buyerId = buyerId;

        const ordersBySeller = {};
        items.forEach(item => {
            if (!ordersBySeller[item.sellerId]) {
                ordersBySeller[item.sellerId] = [];
            }
            ordersBySeller[item.sellerId].push(item);
        });

        // Fetch Buyer and Seller Emails
        const sellerIds = Object.keys(ordersBySeller);
        const sellerDocPromises = sellerIds.map(id => db.collection('users').doc(id).get());
        const buyerDocPromise = db.collection('users').doc(buyerId).get();
        const [buyerDoc, ...sellerDocsSnapshots] = await Promise.all([buyerDocPromise, ...sellerDocPromises]);

        const sellerEmailMap = new Map();
        sellerDocsSnapshots.forEach(doc => {
            if (doc.exists) sellerEmailMap.set(doc.id, doc.data().email);
        });
        
        const buyerEmail = buyerDoc.exists ? buyerDoc.data().email : null;

        // Save the order to Firestore
        const batch = db.batch();
        const ordersRef = db.collection('orders');
        const newOrderIds = [];

        for (const sellerId in ordersBySeller) {
            const sellerItems = ordersBySeller[sellerId];
            const sellerTotalPrice = sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const newOrderRef = ordersRef.doc();
            batch.set(newOrderRef, {
                buyerInfo, sellerId, items: sellerItems,
                totalPrice: sellerTotalPrice, status: "Pending",
                createdAt: FieldValue.serverTimestamp()
            });
            newOrderIds.push(newOrderRef.id);
        }

        // Delete items from cart
        const cartItemsRefs = items.map(item => db.collection('users').doc(buyerId).collection('cart').doc(item.id));
        cartItemsRefs.forEach(ref => batch.delete(ref));

        await batch.commit();

        // Send all notifications
        const notificationPromises = [];

        // 1. Send to Admin
        notificationPromises.push(
            sendAdminNotification(db, apiInstance, buyerInfo, items, totalPrice, newOrderIds)
        );

        // 2. Send to Sellers
        for (const sellerId of sellerIds) {
            const sellerEmail = sellerEmailMap.get(sellerId);
            if (sellerEmail) {
                const sellerItems = ordersBySeller[sellerId];
                const sellerTotalPrice = sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
                notificationPromises.push(
                    sendSellerNotification(db, apiInstance, sellerEmail, buyerInfo, sellerItems, sellerTotalPrice)
                );
            } else {
                console.warn(`No email found for sellerId: ${sellerId}. Cannot notify.`);
            }
        }
        
        // 3. Send to Buyer
        if (buyerEmail) {
            notificationPromises.push(
                sendBuyerNotification(db, apiInstance, buyerEmail, buyerInfo, items, totalPrice)
            );
        } else {
            console.warn(`No email found for buyerId: ${buyerId}. Cannot send receipt.`);
        }

        await Promise.allSettled(notificationPromises);

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

// --- Helper: Log failed emails to Firestore ---
async function logFailedNotification(db, error, emailDetails) {
    try {
        await db.collection('failed_notifications').add({
            ...emailDetails,
            error: error.message || "Unknown error",
            errorBody: error.response?.body || "No response body",
            timestamp: FieldValue.serverTimestamp()
        });
    } catch (logError) {
        console.error("CRITICAL: Failed to log notification failure:", logError);
    }
}

// --- Helper function to send the ADMIN email (NEW STYLE) ---
async function sendAdminNotification(db, apiInstance, buyerInfo, allItems, grandTotal, orderIds) {
    const emailObject = new Brevo.SendSmtpEmail();
    const LOGO_URL = "https://www.kabaleonline.com/icons/512.png"; // Your logo's absolute URL

    // New table-based item list
    const itemHtml = allItems.map(item => `
        <tr style="border-bottom: 1px solid #eeeeee;">
            <td style="padding: 15px 10px; font-size: 16px; color: #555;">
                <strong>${item.productName}</strong><br>
                <span style="font-size: 14px; color: #888;">Qty: ${item.quantity}</span><br>
                <span style="font-size: 14px; color: #c0392b; font-weight: bold;">Seller: ${item.sellerId}</span>
            </td>
            <td style="padding: 15px 10px; font-size: 16px; color: #333; text-align: right; white-space: nowrap;">
                UGX ${(item.price * item.quantity).toLocaleString()}
            </td>
        </tr>
    `).join('');

    emailObject.subject = `🎉 Congrats! New Order on KabaleOnline! Total: UGX ${grandTotal.toLocaleString()}`;
    emailObject.htmlContent = `
    <div style="margin: 0; padding: 0; width: 100%; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <tr>
                            <td align="center" style="padding: 30px 20px 20px 20px;">
                                <img src="${LOGO_URL}" alt="KabaleOnline Logo" width="160" style="max-width: 160px;">
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 40px 40px 40px;">
                                <h1 style="font-size: 24px; color: #333; text-align: center; margin: 0 0 20px 0;">Congrats! New Order!</h1>
                                <p style="font-size: 16px; color: #555; line-height: 1.6; text-align: center;">
                                    A new order was placed on KabaleOnline. This is a great sign!
                                </p>
                                
                                <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">

                                <h3 style="font-size: 18px; color: #333; margin: 0 0 15px 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">All Items in this Order</h3>
                                <table width="100%" border="0" cellpadding="0" cellspacing="0">
                                    ${itemHtml}
                                </table>
                                
                                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                                    <tr style="border-top: 2px solid #333;">
                                        <td style="padding: 15px 0; font-size: 18px; color: #333;"><strong>Grand Total</strong></td>
                                        <td style="padding: 15px 0; font-size: 18px; color: #333; text-align: right;">
                                            <strong>UGX ${grandTotal.toLocaleString()}</strong>
                                        </td>
                                    </tr>
                                </table>

                                <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">

                                <h3 style="font-size: 18px; color: #333; margin: 0 0 15px 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Buyer Details</h3>
                                <p style="margin: 5px 0; font-size: 16px; color: #555;"><strong>Name:</strong> ${buyerInfo.name}</p>
                                <p style="margin: 5px 0; font-size: 16px; color: #555;"><strong>Phone:</strong> ${buyerInfo.phone}</p>
                                <p style="margin: 5px 0; font-size: 16px; color: #555;"><strong>Location:</strong> ${buyerInfo.location}</p>

                                <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">

                                <h3 style="font-size: 18px; color: #333; margin: 0 0 15px 0;">Admin Info</h3>
                                <p style="font-size: 14px; color: #777;"><strong>Firestore Order IDs:</strong> ${orderIds.join(', ')}</p>

                            </td>
                        </tr>
                        <tr style="background-color: #fafafa; border-top: 1px solid #eeeeee;">
                            <td style="padding: 30px; text-align: center;">
                                <p style="margin: 0; font-weight: bold; color: #555555; font-size: 16px;">
                                    #KabaleOnline_team
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>
    `;
    emailObject.sender = { name: "KabaleOnline Admin", email: "support@kabaleonline.com" };
    emailObject.to = [{ email: "shopkabale@gmail.com" }];
    emailObject.replyTo = { email: "support@kabaleonline.com" };

    try {
        await apiInstance.sendTransacEmail(emailObject);
        console.log('Admin notification sent.');
    } catch (error) {
        console.error('Error sending admin email:', error.response?.body);
        await logFailedNotification(db, error, {
            type: "admin",
            to: "shopkabale@gmail.com",
            subject: emailObject.subject
        });
    }
}

// --- Helper function to send a SELLER email (NEW STYLE) ---
async function sendSellerNotification(db, apiInstance, sellerEmail, buyerInfo, sellerItems, sellerTotalPrice) {
    const emailObject = new Brevo.SendSmtpEmail();
    const LOGO_URL = "https://www.kabaleonline.com/icons/512.png"; // Your logo's absolute URL

    // New table-based item list
    const itemHtml = sellerItems.map(item => `
        <tr style="border-bottom: 1px solid #eeeeee;">
            <td style="padding: 15px 10px; font-size: 16px; color: #555;">
                <strong>${item.productName}</strong><br>
                <span style="font-size: 14px; color: #888;">Qty: ${item.quantity}</span>
            </td>
            <td style="padding: 15px 10px; font-size: 16px; color: #333; text-align: right; white-space: nowrap;">
                UGX ${(item.price * item.quantity).toLocaleString()}
            </td>
        </tr>
    `).join('');

    emailObject.subject = `🎉 You have a new order on KabaleOnline!`;
    emailObject.htmlContent = `
    <div style="margin: 0; padding: 0; width: 100%; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <tr>
                            <td align="center" style="padding: 30px 20px 20px 20px;">
                                <img src="${LOGO_URL}" alt="KabaleOnline Logo" width="160" style="max-width: 160px;">
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 40px 40px 40px;">
                                <h1 style="font-size: 24px; color: #333; text-align: center; margin: 0 0 20px 0;">You've made a sale!</h1>
                                <p style="font-size: 16px; color: #555; line-height: 1.6; text-align: center;">
                                    A customer has just ordered your item(s)! An admin will contact you soon to coordinate pickup and payment.
                                </p>
                                
                                <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">

                                <h3 style="font-size: 18px; color: #333; margin: 0 0 15px 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Items to Prepare</h3>
                                <table width="100%" border="0" cellpadding="0" cellspacing="0">
                                    ${itemHtml}
                                </table>
                                
                                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                                    <tr style="border-top: 2px solid #333;">
                                        <td style="padding: 15px 0; font-size: 18px; color: #333;"><strong>Your Subtotal</strong></td>
                                        <td style="padding: 15px 0; font-size: 18px; color: #333; text-align: right;">
                                            <strong>UGX ${sellerTotalPrice.toLocaleString()}</strong>
                                        </td>
                                    </tr>
                                </table>

                                <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">

                                <h3 style="font-size: 18px; color: #333; margin: 0 0 15px 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Buyer Delivery Info</h3>
                                <p style="margin: 5px 0; font-size: 16px; color: #555;"><strong>Name:</strong> ${buyerInfo.name}</p>
                                <p style="margin: 5px 0; font-size: 16px; color: #555;"><strong>Phone:</strong> ${buyerInfo.phone}</p>
                                <p style="margin: 5px 0; font-size: 16px; color: #555;"><strong>Location:</strong> ${buyerInfo.location}</p>

                            </td>
                        </tr>
                        <tr style="background-color: #fafafa; border-top: 1px solid #eeeeee;">
                            <td style="padding: 30px; text-align: center;">
                                <p style="margin: 0; font-weight: bold; color: #555555; font-size: 16px;">
                                    #KabaleOnline_team
                                </p>
                                <p style="margin: 10px 0 0 0; font-size: 14px; color: #888;">
                                    Thank you for selling with KabaleOnline!
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>
    `;
    emailObject.sender = { name: "KabaleOnline", email: "support@kabaleonline.com" };
    emailObject.to = [{ email: sellerEmail }];
    emailObject.replyTo = { email: "support@kabaleonline.com" };

    try {
        await apiInstance.sendTransacEmail(emailObject);
        console.log(`Seller notification sent to: ${sellerEmail}`);
    } catch (error) {
        console.error(`Error sending seller email to ${sellerEmail}:`, error.response?.body);
        await logFailedNotification(db, error, {
            type: "seller",
            to: sellerEmail,
            subject: emailObject.subject
        });
    }
}

// --- Helper function to send the BUYER email (NEW STYLE) ---
async function sendBuyerNotification(db, apiInstance, buyerEmail, buyerInfo, allItems, grandTotal) {
    const emailObject = new Brevo.SendSmtpEmail();
    const LOGO_URL = "https://www.kabaleonline.com/icons/512.png"; // Your logo's absolute URL

    // New table-based item list
    const itemHtml = allItems.map(item => `
        <tr style="border-bottom: 1px solid #eeeeee;">
            <td style="padding: 15px 10px; font-size: 16px; color: #555;">
                <strong>${item.productName}</strong><br>
                <span style="font-size: 14px; color: #888;">Qty: ${item.quantity}</span>
            </td>
            <td style="padding: 15px 10px; font-size: 16px; color: #333; text-align: right; white-space: nowrap;">
                UGX ${(item.price * item.quantity).toLocaleString()}
            </td>
        </tr>
    `).join('');

    emailObject.subject = `Thank you for your order! (KabaleOnline)`;
    emailObject.htmlContent = `
    <div style="margin: 0; padding: 0; width: 100%; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <tr>
                            <td align="center" style="padding: 30px 20px 20px 20px;">
                                <img src="${LOGO_URL}" alt="KabaleOnline Logo" width="160" style="max-width: 160px;">
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 40px 40px 40px;">
                                <h1 style="font-size: 24px; color: #333; text-align: center; margin: 0 0 20px 0;">Thank you, ${buyerInfo.name}!</h1>
                                <p style="font-size: 16px; color: #555; line-height: 1.6; text-align: center;">
                                    We've got your order! An admin will contact you at <strong>${buyerInfo.phone}</strong> soon to confirm delivery.
                                </p>
                                
                                <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">

                                <h3 style="font-size: 18px; color: #333; margin: 0 0 15px 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Your Order Summary</h3>
                                <table width="100%" border="0" cellpadding="0" cellspacing="0">
                                    ${itemHtml}
                                </table>
                                
                                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                                    <tr style="border-top: 2px solid #333;">
                                        <td style="padding: 15px 0; font-size: 18px; color: #333;"><strong>Total</strong></td>
                                        <td style="padding: 15px 0; font-size: 18px; color: #333; text-align: right;">
                                            <strong>UGX ${grandTotal.toLocaleString()}</strong>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" style="padding-top: 5px; font-size: 14px; color: #777; text-align: right;">
                                            (Payment is made on delivery)
                                        </td>
                                    </tr>
                                </table>

                                <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">

                                <h3 style="font-size: 18px; color: #333; margin: 0 0 15px 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Delivery Details</h3>
                                <p style="margin: 5px 0; font-size: 16px; color: #555;"><strong>Name:</strong> ${buyerInfo.name}</p>
                                <p style="margin: 5px 0; font-size: 16px; color: #555;"><strong>Phone:</strong> ${buyerInfo.phone}</p>
                                <p style="margin: 5px 0; font-size: 16px; color: #555;"><strong>Location:</strong> ${buyerInfo.location}</p>

                            </td>
                        </tr>
                        <tr style="background-color: #fafafa; border-top: 1px solid #eeeeee;">
                            <td style="padding: 30px; text-align: center;">
                                <p style="margin: 0; font-weight: bold; color: #555555; font-size: 16px;">
                                    #KabaleOnline_team
                                </p>
                                <p style="margin: 10px 0 0 0; font-size: 14px; color: #888;">
                                    Thank you for shopping local with KabaleOnline!
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>
    `;
    emailObject.sender = { name: "KabaleOnline", email: "support@kabaleonline.com" };
    emailObject.to = [{ email: buyerEmail }];
    emailObject.replyTo = { email: "support@kabaleonline.com" };

    try {
        await apiInstance.sendTransacEmail(emailObject);
        console.log(`Buyer receipt sent to: ${buyerEmail}`);
    } catch (error) {
        console.error(`Error sending buyer receipt to ${buyerEmail}:`, error.response?.body);
        await logFailedNotification(db, error, {
            type: "buyer",
            to: buyerEmail,
            subject: emailObject.subject
        });
    }
}