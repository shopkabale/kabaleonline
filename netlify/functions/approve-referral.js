const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

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

// --- YOUR REWARD RULES ---
const REWARDS_CONFIG = {
  MILESTONES: {
    3: { badge: "Kabale Builder" },
    5: { bonus: 2000 }, // UGX 2,000 shop credit
    10: { badge: "T-Shirt Winner", fulfillment: { type: "KabaleOnline T-shirt" } },
    25: { badge: "Community Leader", bonus: 5000 },
    50: { badge: "Partner" },
  }
};
// --- END OF RULES ---

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
    // 1. --- NEW Security Check ---
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

    const referralData = logDoc.data();
    const { referrerId, baseReward } = referralData;

    if (referralData.status === 'approved') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Already approved' }) };
    }

    const userRef = db.collection('users').doc(referrerId);
    const fulfillmentRef = db.collection('fulfillmentQueue');

    // 3. --- Run as a Transaction ---
    const newCount = await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) throw new Error(`User ${referrerId} not found`);

      const userData = userDoc.data();
      const currentCount = userData.referralCount || 0;
      const newCount = currentCount + 1;
      let rewardToApply = baseReward || 0;
      const currentBadges = new Set(userData.badges || []);

      const milestone = REWARDS_CONFIG.MILESTONES[newCount];
      let fulfillmentTask = null;

      if (milestone) {
        if (milestone.badge) currentBadges.add(milestone.badge);
        if (milestone.bonus) rewardToApply += milestone.bonus;
        if (milestone.fulfillment) {
          fulfillmentTask = {
            userId: referrerId,
            userName: userData.fullName || userData.name || 'N/A',
            reward: milestone.fulfillment.type,
            status: "pending",
            createdAt: Timestamp.now(),
            logId: logId
          };
        }
      }

      t.update(userRef, {
        referralCount: newCount,
        referralBalance: FieldValue.increment(rewardToApply),
        badges: Array.from(currentBadges)
      });
      t.update(logRef, { status: 'approved', processedAt: Timestamp.now() });
      if (fulfillmentTask) {
        t.set(fulfillmentRef.doc(), fulfillmentTask);
      }
      return newCount;
    });

    // 4. --- Return Success ---
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: `Referral approved. User now has ${newCount} referrals.` })
    };

  } catch (error) {
    console.error('Error approving referral:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};