const { MongoClient, ObjectId } = require('mongodb');

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
    
    const { id, slug } = event.queryStringParameters || {};

    if (!id && !slug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Post ID or slug is required' })
      };
    }

    let query;
    if (id) {
      if (!ObjectId.isValid(id)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid post ID' })
        };
      }
      query = { _id: new ObjectId(id) };
    } else {
      query = { slug };
    }

    const post = await postsCollection.findOne(query);

    if (!post) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Post not found' })
      };
    }

    // Increment views
    await postsCollection.updateOne(
      query,
      { $inc: { views: 1 } }
    );

    // Get related posts (same category, excluding current post)
    const relatedPosts = await postsCollection
      .find({ 
        category: post.category,
        status: 'published',
        _id: { $ne: post._id }
      })
      .sort({ publishedAt: -1 })
      .limit(3)
      .toArray();

    const sanitizedPost = {
      ...post,
      _id: post._id.toString(),
      author: post.author || 'KabaleOnline Team'
    };

    const sanitizedRelated = relatedPosts.map(p => ({
      ...p,
      _id: p._id.toString(),
      author: p.author || 'KabaleOnline Team'
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        post: sanitizedPost,
        relatedPosts: sanitizedRelated
      })
    };

  } catch (error) {
    console.error('Error fetching blog post:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};