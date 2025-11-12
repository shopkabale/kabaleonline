const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

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
    'Content-Type': 'application/json'
  };

  try {
    const { category, currentID } = event.queryStringParameters;

    if (!category) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Category is required' }) };
    }

    // Query for 7 items in the same category, that are not sold, ordered by newness
    const query = db.collection('products')
      .where('category', '==', category)
      .where('isSold', '==', false) // Make sure they are in stock
      .orderBy('createdAt', 'desc') // Show newest first
      .limit(7); // Get 7, in case the current one is in the list
      
    const snapshot = await query.get();

    const recommendations = [];
    snapshot.forEach(doc => {
      // Filter out the current product and get the first 6
      if (doc.id !== currentID && recommendations.length < 6) {
        recommendations.push({
          id: doc.id,
          ...doc.data()
        });
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ products: recommendations })
    };

  } catch (error) {
    console.error('Error fetching recommendations:', error);
    // Return an empty list, not an error, so the page doesn't break
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ products: [] }) 
    };
  }
};