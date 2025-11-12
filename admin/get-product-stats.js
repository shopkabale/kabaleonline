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
    const snapshot = await db.collection('products').get();

    let totalProducts = 0;
    let totalProductViews = 0;
    let totalSold = 0;
    let totalStockValue = 0;
    const categories = {};
    const allProducts = [];

    snapshot.forEach(doc => {
      const product = doc.data();
      product._id = doc.id; // Add id for top products list
      
      totalProducts++;
      totalProductViews += product.views || 0;
      
      if (product.isSold) {
        totalSold++;
      } else {
        // Only count value of items NOT sold
        totalStockValue += (product.price || 0) * (product.quantity || 1);
      }

      // Collect data for charts
      const category = product.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = { count: 0, totalViews: 0 };
      }
      categories[category].count++;
      categories[category].totalViews += product.views || 0;
      
      allProducts.push(product);
    });

    // Format category data
    const categoryStats = Object.entries(categories)
      .map(([category, stats]) => ({
        _id: category,
        count: stats.count,
        totalViews: stats.totalViews
      }))
      .sort((a, b) => b.count - a.count);

    // Get Top 5 products by views
    const topProducts = allProducts
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map(p => ({ // Send only what's needed
          _id: p._id,
          name: p.name,
          views: p.views || 0
      }));
      
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalProducts,
        totalProductViews,
        totalSold,
        totalStockValue,
        categories: categoryStats,
        topProducts: topProducts
      })
    };

  } catch (error) {
    console.error('Error fetching product stats:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};