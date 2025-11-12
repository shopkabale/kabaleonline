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
  // This function sends JSON data
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json' // Send JSON
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

    let queryRef;
    if (id) {
      queryRef = db.collection('blog_posts').doc(id);
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
      queryRef = slugQuery.docs[0].ref;
    }

    const doc = await queryRef.get();

    if (!doc.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Post not found' })
      };
    }

    const post = doc.data();

    // Increment views
    await queryRef.update({
      views: FieldValue.increment(1)
    });

    // --- Author Details Fix ---
    let authorDetails = {
        name: 'KabaleOnline Team',
        avatar: '/images/avatar-placeholder.png' 
    };

    if (post.author) {
        try {
            const userQuery = await db.collection('users').where('email', '==', post.author).limit(1).get();
            
            if (!userQuery.empty) {
                const userData = userQuery.docs[0].data();
                authorDetails.name = userData.name || post.author.split('@')[0];
                authorDetails.avatar = userData.photoURL || '/images/avatar-placeholder.png';
            }
        } catch (userError) {
            console.warn("Could not fetch author details by email:", userError);
        }
    }
    // --- End Author Fix ---
    
    // --- Related Posts Fix ---
    const relatedQuery = await db.collection('blog_posts')
      .where('category', '==', post.category)
      .where('status', '==', 'published')
      .orderBy('publishedAt', 'desc')
      .limit(4) 
      .get();

    const relatedPosts = [];
    relatedQuery.forEach(relatedDoc => {
      if (relatedDoc.id !== doc.id) {
        const relatedPost = relatedDoc.data();
        let authorName = (typeof relatedPost.author === 'string') ? relatedPost.author.split('@')[0] : 'KabaleOnline';
        relatedPosts.push({
          _id: relatedDoc.id,
          ...relatedPost,
          author: authorName 
        });
      }
    });
    const finalRelatedPosts = relatedPosts.slice(0, 3);
    // --- End Related Posts ---

    const sanitizedPost = {
      _id: doc.id,
      ...post,
      author: authorDetails, // Send the full object
      createdAt: post.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: post.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      publishedAt: post.publishedAt?.toDate?.()?.toISOString() || null
    };

    const sanitizedRelated = finalRelatedPosts.map(p => ({
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
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};