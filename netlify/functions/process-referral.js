const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

// --- Service Account Config ---
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

// --- RECOMMENDED REWARD RULES (5, 10, 25, 50, 100) ---
const REWARDS_CONFIG = {
  MILESTONES: {
    5: { badge: "Kabale Builder" },
    10: { bonus: 2000 }, // UGX 2,000 bonus
    25: { badge: "T-Shirt Winner", fulfillment: { type: "KabaleOnline T-shirt" } },
    50: { badge: "Community Leader", bonus: 5000 }, // UGX 5,000 bonus
    100: { badge: "Partner" }
  }
};
// --- END OF RULES ---

// --- Helper to verify the *new user* who is calling this function ---
async function verifyNewUser(token, logId) {
    if (!token) {
        throw new Error('No auth token provided.');
    }
    const decodedToken = await auth.verifyIdToken(token.split('Bearer ')[1]);
    const newUserId = decodedToken.uid;
    
    // Security Check: Make sure the user calling this function
    // is the *same one* listed on the referral log.
    const logDoc = await db.collection('referral_log').doc(logId).get();
    if (!logDoc.exists) {
        throw new Error('Referral log not found.');
    }
    
    if (logDoc.data().referredUserId !== newUserId) {
        throw new Error('Authorization mismatch. User does not own this referral.');
    }
    
    if (logDoc.data().status !== 'pending') {
        throw new Error('Referral has already been processed.');
    }
    
    return logDoc.data();
}

// --- Main Handler ---
exports.handler = async (event, context) => {
  const headers = { 'Content-Type': 'application/json' };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    // 1. --- Get Input ---
    const { logId } = JSON.parse(event.body);
    if (!logId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'logId is required' }) };
    }

    // 2. --- Security Check ---
    // This verifies the user is the new user from the log
    const referralData = await verifyNewUser(event.headers.authorization, logId);
    const { referrerId, baseReward } = referralData;
    const logRef = db.collection('referral_log').doc(logId);
    const userRef = db.collection('users').doc(referrerId);
    const fulfillmentRef = db.collection('fulfillmentQueue');

    // 3. --- Run as a Transaction (to give the reward) ---
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
      // We mark the log as 'approved' so it can't be run again
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
      body: JSON.stringify({ success: true, message: `Referral auto-approved. User now has ${newCount} referrals.` })
    };

  } catch (error) {
    console.error('Error processing referral:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};