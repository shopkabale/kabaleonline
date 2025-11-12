const { initializeApp, cert } = require("firebase-admin/app");
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

// --- THIS IS YOUR REWARD RULES ---
const REWARDS_CONFIG = {
  // Milestones are based on the NEW referral count
  MILESTONES: {
    3: { badge: "Kabale Builder" },
    5: { bonus: 2000 }, // UGX 2,000 shop credit
    10: { badge: "T-Shirt Winner", fulfillment: { type: "KabaleOnline T-shirt" } },
    25: { badge: "Community Leader", bonus: 5000 },
    50: { badge: "Partner" },
  }
};
// --- END OF RULES ---

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
    // Your admin panel JS MUST send this secret key.
    const providedSecret = event.headers['authorization']?.split('Bearer ')[1];
    if (providedSecret !== process.env.ADMIN_SECRET_KEY) {
      console.warn('Unauthorized attempt to approve referral.');
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    
    // Add this to Netlify env vars
    // You MUST be an admin to call this
    const { adminUid } = JSON.parse(event.body);
    if (!adminUid) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Admin UID required' }) };
    }
    const adminUser = await db.collection('users').doc(adminUid).get();
    if (!adminUser.exists || adminUser.data().role !== 'admin') {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'You do not have permission' }) };
    }

    // 2. --- Get Input ---
    // Your admin panel must send: { "logId": "...", "adminUid": "..." }
    const { logId } = JSON.parse(event.body);
    if (!logId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'referral_log ID (logId) is required' }) };
    }

    const logRef = db.collection('referral_log').doc(logId);
    const logDoc = await logRef.get();

    if (!logDoc.exists) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Referral log not found' }) };
    }

    const referralData = logDoc.data();
    const { referrerId, baseReward } = referralData;

    // 3. --- Check if Already Processed ---
    if (referralData.status === 'approved') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'This referral has already been approved' }) };
    }

    const userRef = db.collection('users').doc(referrerId);
    const fulfillmentRef = db.collection('fulfillmentQueue');

    // 4. --- Run as a Transaction (All or Nothing) ---
    const newCount = await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) {
        throw new Error(`User ${referrerId} not found`);
      }

      const userData = userDoc.data();

      // --- Calculate New Stats (using your field names) ---
      const currentCount = userData.referralCount || 0;
      const newCount = currentCount + 1;
      
      let rewardToApply = baseReward || 0; // Default to base reward from log

      const currentBadges = new Set(userData.badges || []); // Use a Set to avoid duplicates

      // --- Check for Milestone Rewards ---
      const milestone = REWARDS_CONFIG.MILESTONES[newCount];
      let fulfillmentTask = null;

      if (milestone) {
        if (milestone.badge) {
          currentBadges.add(milestone.badge);
        }
        if (milestone.bonus) {
          rewardToApply += milestone.bonus; // Add milestone bonus
        }
        if (milestone.fulfillment) {
          // Create a new fulfillment task (for the T-Shirt)
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

      // --- Apply Updates to User ---
      t.update(userRef, {
        referralCount: newCount,
        referralBalance: FieldValue.increment(rewardToApply),
        badges: Array.from(currentBadges) // Convert Set back to Array
      });

      // --- Mark the Log as Approved ---
      t.update(logRef, {
        status: 'approved',
        processedAt: Timestamp.now()
      });

      // --- Create Fulfillment Task (if any) ---
      if (fulfillmentTask) {
        const newFulfillmentRef = fulfillmentRef.doc(); // Create a new doc
        t.set(newFulfillmentRef, fulfillmentTask);
      }
      
      return newCount; // Return the new count
    });

    // 5. --- Return Success ---
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: `Referral approved. User now has ${newCount} referrals.` 
      })
    };

  } catch (error) {
    console.error('Error approving referral:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};