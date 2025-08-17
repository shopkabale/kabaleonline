const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize Firebase Admin SDK using Netlify environment variables
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const PRODUCTS_PER_PAGE = 20;

exports.handler = async (event) => {
  const { searchTerm, lastVisible } = event.queryStringParameters;
  
  let q = db.collection("products");

  // If there's a search term, modify the query
  if (searchTerm && searchTerm.trim() !== "") {
    const lowerCaseSearch = searchTerm.toLowerCase();
    q = q.orderBy("name_lowercase")
      .where("name_lowercase", ">=", lowerCaseSearch)
      .where("name_lowercase", "<=", lowerCaseSearch + '\uf8ff');
  } else {
    // If no search term, just order by date
    q = q.orderBy("createdAt", "desc");
  }
  
  // If we're paginating, start after the last visible product
  if (lastVisible) {
    const lastDoc = await db.collection('products').doc(lastVisible).get();
    q = q.startAfter(lastDoc);
  }
  
  q = q.limit(PRODUCTS_PER_PAGE);

  try {
    const snapshot = await q.get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(products),
    };
  } catch (error) {
    console.error("Search function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch products." }),
    };
  }
};
