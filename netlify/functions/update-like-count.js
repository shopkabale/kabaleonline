/*
 * update-like-count.js
 * Netlify function to safely increment or decrement a post's like count.
 */
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Your Firebase service account credentials
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};

// Initialize Firebase Admin
if (!global._firebaseApp) {
  global._firebaseApp = initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Your production URL
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
    const { id, action } = event.queryStringParameters;

    if (!id || !action) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'Post ID and action are required' }) 
      };
    }

    const docRef = db.collection('blog_posts').doc(id);

    // Use FieldValue.increment to safely update the count
    // 'like' increases by 1, 'unlike' decreases by 1
    const increment = (action === 'like') ? 1 : -1;
    
    await docRef.update({
      likes: FieldValue.increment(increment)
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error('Error updating like count:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};