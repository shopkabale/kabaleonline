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
    
    const { 
      page = 1, 
      limit = 10, 
      category, 
      tag, 
      status = 'published',
      author,
      search,
      sort = 'newest'
    } = event.queryStringParameters || {};

    const query = { status };
    if (category && category !== 'all') query.category = category;
    if (tag) query.tags = tag;
    if (author) query.author = author;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Sort options
    let sortOption = { publishedAt: -1, createdAt: -1 };
    if (sort === 'popular') sortOption = { views: -1 };
    if (sort === 'oldest') sortOption = { publishedAt: 1 };

    const [posts, total] = await Promise.all([
      postsCollection
        .find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      postsCollection.countDocuments(query)
    ]);

    // Convert MongoDB ObjectId to string for client
    const sanitizedPosts = posts.map(post => ({
      ...post,
      _id: post._id.toString(),
      author: post.author || 'KabaleOnline Team'
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        posts: sanitizedPosts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limitNum),
          totalPosts: total,
          hasNext: skip + posts.length < total,
          hasPrev: parseInt(page) > 1
        }
      })
    };

  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};