const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const fs = require('fs');
const path = require('path');

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};

if (!global._firebaseApp) {
  global._firebaseApp = initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

// Helper to read the HTML template
function getTemplate() {
    const templatePath = path.join(__dirname, 'templates', 'post-template.html');
    return fs.readFileSync(templatePath, 'utf8');
}

// Helper to escape HTML
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

exports.handler = async (event, context) => {
  const { id, slug, format } = event.queryStringParameters || {};

  // --- JOB 1: Send JSON data to post.js ---
  if (format === 'json') {
    return handleJsonRequest(id, slug);
  }

  // --- JOB 2: Send HTML page to bot/browser ---
  return handleHtmlRequest(id, slug);
};

// --- This part sends the data to your post.js ---
async function handleJsonRequest(id, slug) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };
    
    try {
        if (!id && !slug) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Post ID or slug is required' }) };
        }

        let queryRef;
        if (id) {
          queryRef = db.collection('blog_posts').doc(id);
        } else {
          const slugQuery = await db.collection('blog_posts').where('slug', '==', slug).limit(1).get();
          if (slugQuery.empty) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'Post not found' }) };
          }
          queryRef = slugQuery.docs[0].ref;
        }

        const doc = await queryRef.get();
        if (!doc.exists) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'Post not found' }) };
        }
        
        const post = doc.data();

        // Increment views
        await queryRef.update({ views: FieldValue.increment(1) });

        // Author Details
        let authorDetails = { name: 'KabaleOnline Team', avatar: '/images/avatar-placeholder.png' };
        if (post.author) {
            try {
                const userQuery = await db.collection('users').where('email', '==', post.author).limit(1).get();
                if (!userQuery.empty) {
                    const userData = userQuery.docs[0].data();
                    authorDetails.name = userData.name || post.author.split('@')[0];
                    authorDetails.avatar = userData.photoURL || '/images/avatar-placeholder.png';
                }
            } catch (userError) { console.warn("Could not fetch author details:", userError); }
        }
        
        // Related Posts
        const relatedQuery = await db.collection('blog_posts').where('category', '==', post.category).where('status', '==', 'published').orderBy('publishedAt', 'desc').limit(4).get();
        const relatedPosts = [];
        relatedQuery.forEach(relatedDoc => {
          if (relatedDoc.id !== doc.id) {
            const relatedPost = relatedDoc.data();
            let authorName = (typeof relatedPost.author === 'string') ? relatedPost.author.split('@')[0] : 'KabaleOnline';
            relatedPosts.push({ _id: relatedDoc.id, ...relatedPost, author: authorName });
          }
        });
        const finalRelatedPosts = relatedPosts.slice(0, 3);

        // Sanitize and send
        const sanitizedPost = {
          _id: doc.id, ...post, author: authorDetails,
          createdAt: post.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: post.updatedAt?.toDate?.()?.toISOString() || null,
          publishedAt: post.publishedAt?.toDate?.()?.toISOString() || null
        };
        const sanitizedRelated = finalRelatedPosts.map(p => ({
          ...p,
          createdAt: p.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: p.updatedAt?.toDate?.()?.toISOString() || null,
          publishedAt: p.publishedAt?.toDate?.()?.toISOString() || null
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ post: sanitizedPost, relatedPosts: sanitizedRelated })
        };

    } catch (error) {
        console.error('Error handling JSON request:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
    }
}

// --- This part sends the HTML to WhatsApp ---
async function handleHtmlRequest(id, slug) {
    const headers = { 'Content-Type': 'text/html' };
    
    try {
        if (!id && !slug) {
            return { statusCode: 400, headers, body: '<h1>Error 400</h1><p>Post ID or slug is required.</p>' };
        }

        let queryRef;
        if (id) {
          queryRef = db.collection('blog_posts').doc(id);
        } else {
          const slugQuery = await db.collection('blog_posts').where('slug', '==', slug).limit(1).get();
          if (slugQuery.empty) {
            return { statusCode: 302, headers: { 'Location': '/blog/' } };
          }
          queryRef = slugQuery.docs[0].ref;
        }

        const doc = await queryRef.get();
        if (!doc.exists) {
            return { statusCode: 302, headers: { 'Location': '/blog/' } };
        }

        const post = doc.data();
        let html = getTemplate();

        const postTitle = escapeHTML(post.title);
        const postDescription = escapeHTML(post.excerpt || post.content.substring(0, 160));
        const postImage = post.featuredImage || 'https://kabaleonline.com/icons/512.png';
        const postUrl = `https://kabaleonline.com/blog/post.html?id=${doc.id}`;

        html = html.replace(/__POST_TITLE__/g, postTitle);
        html = html.replace(/__POST_DESCRIPTION__/g, postDescription);
        html = html.replace(/__POST_IMAGE__/g, postImage);
        html = html.replace(/__POST_URL__/g, postUrl);

        return {
            statusCode: 200,
            headers,
            body: html
        };
    } catch (error) {
        console.error('Error handling HTML request:', error);
        return { statusCode: 500, headers, body: '<h1>Error 500</h1><p>Could not load post.</p>' };
    }
}