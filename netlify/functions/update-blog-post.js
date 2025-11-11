const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

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
    const { id } = event.queryStringParameters;
    const data = JSON.parse(event.body);

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Post ID is required' })
      };
    }

    const updateData = {
      ...data,
      updatedAt: FieldValue.serverTimestamp()
    };

    // Recalculate read time if content changed
    if (data.content) {
      updateData.readTime = calculateReadTime(data.content);
    }

    // Generate new slug if title changed
    if (data.title) {
      updateData.slug = generateSlug(data.title);
    }

    // If publishing for the first time, set publishedAt
    if (data.status === 'published') {
      const existingDoc = await db.collection('blog_posts').doc(id).get();
      if (existingDoc.exists) {
        const existingPost = existingDoc.data();
        if (!existingPost.publishedAt) {
          updateData.publishedAt = FieldValue.serverTimestamp();
        }
      }
    }

    await db.collection('blog_posts').doc(id).update(updateData);

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