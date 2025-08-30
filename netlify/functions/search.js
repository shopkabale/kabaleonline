const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const PRODUCTS_PER_PAGE = 30;

exports.handler = async (event) => {
  const { searchTerm, category, minPrice, maxPrice, lastVisible } = event.queryStringParameters;

  let q = db.collection("products");

  // PRIORITY 1: If there's a search term, perform a name search.
  if (searchTerm && searchTerm.trim() !== "") {
    const lowerCaseSearch = searchTerm.toLowerCase();
    q = q.orderBy("name_lowercase")
      .where("name_lowercase", ">=", lowerCaseSearch)
      .where("name_lowercase", "<=", lowerCaseSearch + '\uf8ff');
  } 
  // PRIORITY 2: If no search term, apply filters.
  else {
    if (category) {
      q = q.where("category", "==", category);
    }
    if (minPrice) {
      q = q.where("price", ">=", Number(minPrice));
    }
    if (maxPrice) {
      q = q.where("price", "<=", Number(maxPrice));
    }

    // When using price filters, Firestore requires ordering by price.
    // Otherwise, we sort by creation date for "newest first".
    if (minPrice || maxPrice) {
        q = q.orderBy("price");
    } else {
        q = q.orderBy("createdAt", "desc");
    }
  }

  // Handle pagination
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
    // Firestore often gives specific errors for bad queries.
    // This helps in debugging if you forgot to create an index.
    const errorMessage = error.message.includes("indexes")
      ? "Query requires a Firestore index. Please check your Firebase console."
      : "Failed to fetch products.";
      
    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMessage, details: error.message }),
    };
  }
};
