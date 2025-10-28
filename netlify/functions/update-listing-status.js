// File Path: /netlify/functions/update-listing-status.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
    }),
  });
}
const db = admin.firestore();

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') { return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }; }
    const token = event.headers.authorization?.split('Bearer ')[1];
    if (!token) { return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: No token.' }) }; }
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid;
        const { productName, newStatus } = JSON.parse(event.body);
        if (!productName || typeof newStatus.isSold !== 'boolean') {
            return { statusCode: 400, body: JSON.stringify({ error: 'Product name and new status are required.' }) };
        }
        const query = db.collection('products').where('sellerId', '==', userId).where('name_lowercase', '==', productName.toLowerCase());
        const snapshot = await query.get();
        if (snapshot.empty) {
            return { statusCode: 200, body: JSON.stringify({ text: `Sorry, I couldn't find an active listing with the title "${productName}". Please make sure the title is exact.` }) };
        }
        const docId = snapshot.docs[0].id;
        await db.collection('products').doc(docId).update(newStatus);
        return { statusCode: 200, body: JSON.stringify({ text: `Great! I've marked "${productName}" as ${newStatus.isSold ? 'Sold' : 'Available'}. Congratulations! 🎉` }) };
    } catch (error) {
        console.error("Update listing error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update listing.' }) };
    }
};