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

exports.handler = async (event, context) => {
  try {
    // 1. Calculate previous month's date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // 2. Query for all approved referrals in that month
    const logQuery = await db.collection('referral_log')
      .where('status', '==', 'approved')
      .where('createdAt', '>=', Timestamp.fromDate(startOfMonth))
      .where('createdAt', '<=', Timestamp.fromDate(endOfMonth))
      .get();

    if (logQuery.empty) {
      console.log('No approved referrals found for the previous month.');
      return { statusCode: 200, body: 'No data.' };
    }

    // 3. Count referrals per user
    const counts = {};
    logQuery.forEach(doc => {
      const { referrerId } = doc.data();
      counts[referrerId] = (counts[referrerId] || 0) + 1;
    });

    // 4. Sort to find Top 5
    const sortedReferrers = Object.entries(counts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5); // Get only the Top 5

    // 5. Get user data for the Top 5
    const leaderboard = [];
    for (const [userId, count] of sortedReferrers) {
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          // Using your field names from screenshot
          const { fullName, name, photoURL, profilePhotoUrl } = userDoc.data();
          leaderboard.push({
            userId,
            name: fullName || name || 'Anonymous',
            photoURL: photoURL || profilePhotoUrl || '/images/avatar-placeholder.png',
            count
          });
        }
      } catch (err) {
        console.warn(`Could not fetch user ${userId}`, err);
      }
    }

    // 6. Save to a simple doc for the homepage to read
    const leaderboardRef = db.collection('siteConfig').doc('monthlyLeaderboard');
    await leaderboardRef.set({
      title: `Top Referrers for ${startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      leaders: leaderboard,
      updatedAt: Timestamp.now()
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, leaderboard })
    };

  } catch (error) {
    console.error('Error running monthly-leaderboard function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};