// This is a Netlify serverless function.
// It connects to your Firebase database to fetch the latest services.

// Import the Firebase Admin SDK
const admin = require('firebase-admin');
const { getFirestore, collection, query, where, orderBy, limit, getDocs } = require('firebase-admin/firestore');

// You need to set your Firebase service account key as a JSON environment variable in Netlify.
// Name the variable: FIREBASE_SERVICE_ACCOUNT
// This keeps your secret key safe.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Initialize Firebase Admin App if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Get a reference to the Firestore database
const db = getFirestore();

exports.handler = async (event, context) => {
  try {
    // 1. Define the query to get products from the 'products' collection
    const productsRef = collection(db, 'products');
    const q = query(
        productsRef, 
        where('category', '==', 'Services'), // 2. Filter: only where the category is 'Services'
        orderBy('createdAt', 'desc'),        // 3. Order: show the newest services first
        limit(8)                             // 4. Limit: fetch only the latest 8 services for the homepage
    );

    // 5. Execute the query
    const querySnapshot = await getDocs(q);

    // 6. Process the results
    const services = [];
    querySnapshot.forEach(doc => {
      services.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // 7. Return the data as a successful JSON response
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Allows your frontend to call this function
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(services),
    };
  } catch (error) {
    console.error('Error fetching services:', error);
    // 8. Return an error response if something goes wrong
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to fetch services.' }),
    };
  }
};
