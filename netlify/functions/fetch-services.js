const admin = require('firebase-admin');
const { getFirestore, collection, query, where, orderBy, limit, getDocs } = require('firebase-admin/firestore');

// NEW: Decode the Base64 string back into JSON
const serviceAccountEncoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const serviceAccount = JSON.parse(Buffer.from(serviceAccountEncoded, 'base64').toString('utf8'));

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore();

exports.handler = async (event, context) => {
  try {
    const productsRef = collection(db, 'products');
    const q = query(
        productsRef, 
        where('listing_type', '==', 'service'), 
        orderBy('createdAt', 'desc'),
        limit(8)
    );

    const querySnapshot = await getDocs(q);
    const services = [];
    querySnapshot.forEach(doc => {
      services.push({ id: doc.id, ...doc.data() });
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify(services),
    };
  } catch (error) {
    console.error('Error fetching services:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch services.' }) };
  }
};
