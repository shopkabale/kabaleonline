const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Uses the secure environment variables you set up in Netlify
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // This safely decodes your multi-line private key
  privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const PRODUCTS_PER_PAGE = 40; // <-- Set to 40

exports.handler = async (event) => {
  const { searchTerm, lastVisible } = event.queryStringParameters;
  
  let q = db.collection("products");

  // If there's a search term, create a search query
  if (searchTerm && searchTerm.trim() !== "") {
    const lowerCaseSearch = searchTerm.toLowerCase();
    q = q.orderBy("name_lowercase")
      .where("name_lowercase", ">=", lowerCaseSearch)
      .where("name_lowercase", "<=", lowerCaseSearch + '\uf8ff');
  } else {
    // If no search term, just order by date
    q = q.orderBy("createdAt", "desc");
  }
  
  // If we are loading the next page, start after the last product we saw
  if (lastVisible) {
    const lastDoc = await db.collection('products').doc(lastVisible).get();
    q = q.startAfter(lastDoc);
  }
  
  // Limit the results to the number per page
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
