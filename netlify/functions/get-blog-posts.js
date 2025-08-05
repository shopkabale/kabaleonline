const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_BLOG_TABLE_NAME } = process.env;

// We can use a simple cache for blog posts as well
const cache = {
  posts: null,
  timestamp: 0,
};
const CACHE_DURATION_MS = 16 * 60 * 60 * 1000; // 10-hour cache for the blog


exports.handler = async (event) => {
  const { slug } = event.queryStringParameters;
  
  // If a slug is provided, we are fetching a single post. We don't cache this.
  if (slug) {
    return fetchSinglePost(slug);
  }

  // Otherwise, we are fetching the list of all posts. We use a cache.
  const now = Date.now();
  if (cache.posts && (now - cache.timestamp < CACHE_DURATION_MS)) {
    console.log('Serving blog posts from CACHE');
    return { statusCode: 200, body: JSON.stringify(cache.posts) };
  }

  console.log('CACHE MISS. Fetching blog posts from Airtable.');
  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_BLOG_TABLE_NAME}?filterByFormula={Status}='Published'&sort%5B0%5D%5Bfield%5D=PublishDate&sort%5B0%5D%5Bdirection%5D=desc`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` } });
    if (!response.ok) throw new Error('Failed to fetch blog posts');
    
    const data = await response.json();
    cache.posts = data;
    cache.timestamp = now;

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

// Helper function to fetch a single post by its slug
async function fetchSinglePost(slug) {
  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_BLOG_TABLE_NAME}?filterByFormula=AND({Status}='Published', {Slug}='${slug}')`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` } });
    if (!response.ok) throw new Error('Failed to fetch single post');
    
    const data = await response.json();
    if (data.records.length === 0) throw new Error('Post not found');

    return { statusCode: 200, body: JSON.stringify(data.records[0]) };
  } catch (error) {
    return { statusCode: 404, body: JSON.stringify({ error: error.message }) };
  }
}
