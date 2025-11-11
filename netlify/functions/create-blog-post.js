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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const db = await connectToDatabase();
    const postsCollection = db.collection('blog_posts');
    
    const data = JSON.parse(event.body);
    const { title, content, excerpt, category, tags, author, featuredImage, status = 'draft' } = data;

    // Validate required fields
    if (!title || !content || !author) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Title, content, and author are required' })
      };
    }

    const now = new Date();
    const slug = generateSlug(title);
    
    const postData = {
      title,
      content,
      excerpt: excerpt || content.substring(0, 200) + '...',
      category: category || 'Uncategorized',
      tags: tags || [],
      author,
      featuredImage: featuredImage || null,
      status,
      slug,
      readTime: calculateReadTime(content),
      views: 0,
      likes: 0,
      createdAt: now,
      updatedAt: now,
      publishedAt: status === 'published' ? now : null
    };

    const result = await postsCollection.insertOne(postData);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        success: true, 
        postId: result.insertedId,
        slug 
      })
    };

  } catch (error) {
    console.error('Error creating blog post:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function calculateReadTime(content) {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}