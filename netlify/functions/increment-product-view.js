const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};

if (!global._firebaseApp) {
  global._firebaseApp = initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { id } = event.queryStringParameters;
    if (!id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Product ID is required' }) };
    }
    
    const docRef = db.collection('products').doc(id);

    // 1. Increment the count
    await docRef.update({
      views: FieldValue.increment(1)
    });

    // 2. Get the new, updated document
    const updatedDoc = await docRef.get();
    const newViewCount = updatedDoc.data().views || 1;

    // 3. Send the new count back to the frontend
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, newViewCount: newViewCount })
    };

  } catch (error) {
    console.warn('Failed to increment view count:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to increment' })
    };
  }
};