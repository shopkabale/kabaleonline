const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

// Your existing service account logic
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};

if (!global._firebaseApp) {
  global._firebaseApp = initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();
const auth = getAuth();

// Helper function to verify admin
async function verifyAdmin(token) {
    if (!token) {
        throw new Error('No auth token provided.');
    }
    const decodedToken = await auth.verifyIdToken(token.split('Bearer ')[1]);
    const adminUid = decodedToken.uid;
    const adminUser = await db.collection('users').doc(adminUid).get();
    if (!adminUser.exists || adminUser.data().role !== 'admin') {
        throw new Error('User is not an admin.');
    }
    return adminUid;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Or lock to your admin domain
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    // 1. --- Security Check ---
    await verifyAdmin(event.headers.authorization);

    // 2. --- Get Input ---
    const { logId } = JSON.parse(event.body);
    if (!logId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'logId is required' }) };
    }

    const logRef = db.collection('referral_log').doc(logId);
    const logDoc = await logRef.get();

    if (!logDoc.exists) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Referral log not found' }) };
    }
    
    if (logDoc.data().status !== 'pending') {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Referral not pending' }) };
    }

    // 3. --- Update the log status to "rejected" ---
    await logRef.update({
        status: 'rejected',
        processedAt: Timestamp.now()
    });

    // 4. --- Return Success ---
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Referral rejected.' })
    };

  } catch (error) {
    console.error('Error rejecting referral:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};