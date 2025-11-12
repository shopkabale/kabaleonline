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

// --- NEW HELPER FUNCTION ---
// This efficiently fetches all author details with one query
async function getAuthorDetails(posts) {
    // 1. Get all unique author emails
    const authorEmails = [...new Set(posts.map(post => post.author))];
    
    // 2. Create a fallback map
    const authorMap = new Map();
    authorEmails.forEach(email => {
        authorMap.set(email, {
            name: email.split('@')[0] || 'KabaleOnline Team', // Default to part of email
            avatar: '/images/avatar-placeholder.png' // Default avatar
        });
    });

    if (authorEmails.length === 0) {
        return authorMap;
    }

    // 3. Fetch all matching users in one query
    try {
        const usersSnapshot = await db.collection('users').where('email', 'in', authorEmails).get();
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            authorMap.set(userData.email, {
                name: userData.name || userData.email, // Use real name
                avatar: userData.photoURL || '/images/avatar-placeholder.png' // Use real photoURL
            });
        });
    } catch (error) {
        console.warn("Error fetching author details:", error);
    }
    
    return authorMap;
}
// --- END NEW HELPER ---


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
      status = 'published', // Default to published for public blog
      author,
      search,
      sort = 'newest'
    } = event.queryStringParameters || {};

    let query = db.collection('blog_posts');

    // Apply filters
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }
    if (category && category !== 'all') {
      query = query.where('category', '==', category);
    }
    if (author) {
      query = query.where('author', '==', author);
    }

    const snapshot = await query.get();
    let posts = [];

    snapshot.forEach(doc => {
      const post = doc.data();
      
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          post.title?.toLowerCase().includes(searchLower) ||
          post.excerpt?.toLowerCase().includes(searchLower) ||
          post.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        if (!matchesSearch) return;
      }

      if (tag && !post.tags?.includes(tag)) return;

      posts.push({
        _id: doc.id,
        ...post
      });
    });

    // Sort in-memory
    let sortField = 'publishedAt';
    let sortDirection = 'desc';

    if (sort === 'popular') {
        sortField = 'views';
    } else if (sort === 'oldest') {
        sortField = 'publishedAt';
        sortDirection = 'asc';
    }

    posts.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        
        if (valA && typeof valA.toDate === 'function') valA = valA.toDate();
        if (valB && typeof valB.toDate === 'function') valB = valB.toDate();

        if (sortField === 'publishedAt') {
            if (valA === null && valB === null) return 0;
            if (valA === null) return sortDirection === 'desc' ? 1 : -1;
            if (valB === null) return sortDirection === 'desc' ? -1 : 1;
        }

        valA = valA || 0;
        valB = valB || 0;

        if (valA instanceof Date) {
            return (sortDirection === 'desc') ? valB.getTime() - valA.getTime() : valA.getTime() - valB.getTime();
        } else {
            return (sortDirection === 'desc') ? valB - valA : valA - valB;
        }
    });

    // --- **NEW: REPLACE AUTHOR EMAIL WITH OBJECT** ---
    const authorMap = await getAuthorDetails(posts);

    const postsWithAuthors = posts.map(post => {
        return {
            ...post,
            author: authorMap.get(post.author) || { name: 'KabaleOnline Team', avatar: '/images/avatar-placeholder.png' }
        };
    });
    // --- **END NEW** ---

    // Manual pagination
    const intPage = parseInt(page);
    const intLimit = parseInt(limit);
    const startIndex = (intPage - 1) * intLimit;
    const endIndex = startIndex + intLimit;
    const paginatedPosts = postsWithAuthors.slice(startIndex, endIndex);

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
          currentPage: intPage,
          totalPages: Math.ceil(posts.length / intLimit),
          totalPosts: posts.length,
          hasNext: endIndex < posts.length,
          hasPrev: intPage > 1
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