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

    let query = db.collection('blog_posts').where('status', '==', status);

    // Apply filters
    if (category && category !== 'all') {
      query = query.where('category', '==', category);
    }
    if (author) {
      query = query.where('author', '==', author);
    }

    // Apply sorting
    let sortField = 'publishedAt';
    let sortDirection = 'desc';
    
    if (sort === 'popular') {
      sortField = 'views';
      sortDirection = 'desc';
    } else if (sort === 'oldest') {
      sortField = 'publishedAt';
      sortDirection = 'asc';
    }

    query = query.orderBy(sortField, sortDirection);

    const snapshot = await query.get();
    let posts = [];

    snapshot.forEach(doc => {
      const post = doc.data();
      // Handle search filtering in memory
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          post.title?.toLowerCase().includes(searchLower) ||
          post.excerpt?.toLowerCase().includes(searchLower) ||
          post.content?.toLowerCase().includes(searchLower) ||
          post.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return;
      }

      // Handle tag filtering
      if (tag && !post.tags?.includes(tag)) return;

      posts.push({
        _id: doc.id,
        ...post,
        author: post.author || 'KabaleOnline Team'
      });
    });

    // Manual pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedPosts = posts.slice(startIndex, endIndex);

    // Convert Firestore timestamps to ISO strings
    const sanitizedPosts = paginatedPosts.map(post => ({
      ...post,
      createdAt: post.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: post.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      publishedAt: post.publishedAt?.toDate?.()?.toISOString() || null
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        posts: sanitizedPosts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(posts.length / parseInt(limit)),
          totalPosts: posts.length,
          hasNext: endIndex < posts.length,
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