const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};

if (!initializeApp.length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}
const db = getFirestore();
const PRODUCTS_PER_PAGE = 40;

exports.handler = async (event) => {
  const { searchTerm, category, minPrice, maxPrice, lastVisible } = event.queryStringParameters;

  let q = db.collection("products");

  if (searchTerm && searchTerm.trim() !== "") {
    const lowerCaseSearch = searchTerm.toLowerCase();
    q = q.where("keywords", "array-contains", lowerCaseSearch);
  }

  if (category) {
    q = q.where("category", "==", category);
  }
  if (minPrice) {
    q = q.where("price", ">=", Number(minPrice));
  }
  if (maxPrice) {
    q = q.where("price", "<=", Number(maxPrice));
  }

  if (minPrice || maxPrice) {
      q = q.orderBy("price");
  } else {
      q = q.orderBy("createdAt", "desc");
  }
  
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
      body: JSON.stringify({ error: "Failed to fetch products.", details: error.message }),
    };
  }
};
