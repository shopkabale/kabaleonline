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
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const snapshot = await db.collection('blog_posts')
      .where('status', '==', 'published')
      .get();

    let totalPosts = 0;
    let totalViews = 0;
    let totalLikes = 0;
    let totalReadTime = 0;
    const categories = {};

    snapshot.forEach(doc => {
      const post = doc.data();
      totalPosts++;
      totalViews += post.views || 0;
      totalLikes += post.likes || 0;
      totalReadTime += post.readTime || 0;

      // Count by category
      const category = post.category || 'Uncategorized';
      categories[category] = (categories[category] || 0) + 1;
    });

    const avgReadTime = totalPosts > 0 ? Math.round(totalReadTime / totalPosts) : 0;

    const categoryStats = Object.entries(categories)
      .map(([category, count]) => ({
        _id: category,
        count,
        totalViews: snapshot.docs
          .filter(doc => doc.data().category === category)
          .reduce((sum, doc) => sum + (doc.data().views || 0), 0)
      }))
      .sort((a, b) => b.count - a.count);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalPosts,
        totalViews,
        totalLikes,
        avgReadTime,
        categories: categoryStats
      })
    };

  } catch (error) {
    console.error('Error fetching blog stats:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};