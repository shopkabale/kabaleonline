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
    'Access-Control-Allow-Methods': 'PUT, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'PUT') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const db = await connectToDatabase();
    const postsCollection = db.collection('blog_posts');
    
    const { id } = event.queryStringParameters;
    const data = JSON.parse(event.body);

    if (!id || !ObjectId.isValid(id)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid post ID is required' })
      };
    }

    const updateData = {
      ...data,
      updatedAt: new Date()
    };

    // Recalculate read time if content changed
    if (data.content) {
      updateData.readTime = calculateReadTime(data.content);
    }

    // If publishing for the first time, set publishedAt
    if (data.status === 'published') {
      const existingPost = await postsCollection.findOne({ _id: new ObjectId(id) });
      if (existingPost && !existingPost.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    // Generate new slug if title changed
    if (data.title) {
      updateData.slug = generateSlug(data.title);
    }

    const result = await postsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Post not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Post updated successfully',
        slug: updateData.slug 
      })
    };

  } catch (error) {
    console.error('Error updating blog post:', error);
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