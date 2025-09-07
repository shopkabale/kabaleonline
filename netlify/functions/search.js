import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Replace with your Firebase Admin SDK service account key
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

exports.handler = async (event, context) => {
  const { searchTerm, type, lastVisible } = event.queryStringParameters;
  let productsRef = db.collection('products');
  let querySnapshot;

  try {
    // Check if the 'type' query parameter exists and filter accordingly.
    // The field name 'listing_type' must match your database.
    if (type) {
      productsRef = productsRef.where('listing_type', '==', type);
    }
    
    // Check if a search term exists and filter by it
    if (searchTerm) {
      // For a simple text search, Firestore requires a start/end range.
      // This is a basic prefix search.
      const searchTermLower = searchTerm.toLowerCase();
      productsRef = productsRef
        .where('name_lowercase', '>=', searchTermLower)
        .where('name_lowercase', '<=', searchTermLower + '\uf8ff');
    }

    // Always order by a field to ensure consistent pagination
    productsRef = productsRef.orderBy('createdAt', 'desc');

    // Implement pagination
    if (lastVisible) {
      const lastVisibleDoc = await db.collection('products').doc(lastVisible).get();
      productsRef = productsRef.startAfter(lastVisibleDoc);
    }

    // Add a limit to prevent fetching too many documents at once
    productsRef = productsRef.limit(30);

    querySnapshot = await productsRef.get();

    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(products),
    };
  } catch (error) {
    console.error("Error fetching products:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch products." }),
    };
  }
};
