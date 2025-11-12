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
    
    // This object will hold all category stats
    const categories = {};

    snapshot.forEach(doc => {
      const post = doc.data();
      
      // Increment global stats
      totalPosts++;
      totalViews += post.views || 0;
      totalLikes += post.likes || 0;
      totalReadTime += post.readTime || 0;

      // --- UPGRADE: Calculate category stats in one loop ---
      const category = post.category || 'Uncategorized';
      
      // Initialize category if it's new
      if (!categories[category]) {
        categories[category] = { count: 0, totalViews: 0 };
      }
      
      // Add stats for this post's category
      categories[category].count++;
      categories[category].totalViews += post.views || 0;
      // --- END UPGRADE ---
    });

    const avgReadTime = totalPosts > 0 ? Math.round(totalReadTime / totalPosts) : 0;

    // --- UPGRADE: Reformat the categories object ---
    const categoryStats = Object.entries(categories)
      .map(([category, stats]) => ({
        _id: category,
        count: stats.count,
        totalViews: stats.totalViews
      }))
      .sort((a, b) => b.count - a.count); // Sort by most popular category
    // --- END UPGRADE ---

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