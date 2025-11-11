const { MongoClient } = require('mongodb');

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  const client = await MongoClient.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  cachedDb = client.db();
  return cachedDb;
}

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
    const db = await connectToDatabase();
    const postsCollection = db.collection('blog_posts');

    const stats = await postsCollection.aggregate([
      {
        $match: { status: 'published' }
      },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          avgReadTime: { $avg: '$readTime' }
        }
      }
    ]).toArray();

    const categoryStats = await postsCollection.aggregate([
      {
        $match: { status: 'published' }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalViews: { $sum: '$views' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    const basicStats = stats[0] || {
      totalPosts: 0,
      totalViews: 0,
      totalLikes: 0,
      avgReadTime: 0
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...basicStats,
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