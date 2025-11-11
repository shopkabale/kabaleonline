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
      status, // Removed default 'published' to handle 'all'
      author,
      search,
      sort = 'newest'
    } = event.queryStringParameters || {};

    let query = db.collection('blog_posts');

    // **FIX 1: Smarter Filtering**
    // Only apply filters if they are provided and not 'all'
    if (status && status !== 'all' && status !== '') {
      query = query.where('status', '==', status);
    }
    if (category && category !== 'all' && category !== '') {
      query = query.where('category', '==', category);
    }
    if (author) {
      query = query.where('author', '==', author);
    }

    // **FIX 2: Remove Sorting from Query (to prevent crash)**
    // We will sort in-memory later
    // REMOVED: query = query.orderBy(sortField, sortDirection);

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
        ...post
      });
    });

    // **FIX 2 (CONTINUED): Sort in-memory**
    let sortField = 'publishedAt';
    let sortDirection = 'desc';

    if (sort === 'popular') {
      sortField = 'views';
      sortDirection = 'desc';
    } else if (sort === 'oldest') {
      sortField = 'publishedAt';
      sortDirection = 'asc';
    }

    posts.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      // Handle Firestore Timestamps
      if (valA && typeof valA.toDate === 'function') valA = valA.toDate();
      if (valB && typeof valB.toDate === 'function') valB = valB.toDate();

      // Handle nulls (e.g., drafts have null publishedAt)
      if (sortField === 'publishedAt') {
        if (valA === null && valB === null) return 0;
        if (valA === null) return sortDirection === 'desc' ? 1 : -1;
        if (valB === null) return sortDirection === 'desc' ? -1 : 1;
      }

      // Handle numbers or dates that are not null
      valA = valA || 0;
      valB = valB || 0;

      if (valA instanceof Date) {
        if (sortDirection === 'desc') return valB.getTime() - valA.getTime();
        return valA.getTime() - valB.getTime();
      } else {
        if (sortDirection === 'desc') return valB - valA;
        return valA - valB;
      }
    });

    // Manual pagination (on the sorted results)
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedPosts = posts.slice(startIndex, endIndex);

    // Convert Firestore timestamps to ISO strings
    const sanitizedPosts = paginatedPosts.map(post => ({
      ...post,
      author: post.author || 'KabaleOnline Team', // Ensure author exists
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