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
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
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
      query = db.collection('blog_posts').doc(id);
    } else {
      const slugQuery = await db.collection('blog_posts')
        .where('slug', '==', slug)
        .limit(1)
        .get();
      
      if (slugQuery.empty) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Post not found' })
        };
      }
      
      query = slugQuery.docs[0].ref;
    }

    const doc = await query.get();
    
    if (!doc.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Post not found' })
      };
    }

    const post = doc.data();

    // Increment views
    await query.update({
      views: FieldValue.increment(1)
    });

    // Get related posts
    const relatedQuery = await db.collection('blog_posts')
      .where('category', '==', post.category)
      .where('status', '==', 'published')
      .where('__name__', '!=', doc.id)
      .orderBy('publishedAt', 'desc')
      .limit(3)
      .get();

    const relatedPosts = [];
    relatedQuery.forEach(relatedDoc => {
      const relatedPost = relatedDoc.data();
      relatedPosts.push({
        _id: relatedDoc.id,
        ...relatedPost,
        author: relatedPost.author || 'KabaleOnline Team'
      });
    });

    // Convert Firestore timestamps
    const sanitizedPost = {
      _id: doc.id,
      ...post,
      author: post.author || 'KabaleOnline Team',
      createdAt: post.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: post.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      publishedAt: post.publishedAt?.toDate?.()?.toISOString() || null
    };

    const sanitizedRelated = relatedPosts.map(p => ({
      ...p,
      createdAt: p.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: p.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      publishedAt: p.publishedAt?.toDate?.()?.toISOString() || null
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