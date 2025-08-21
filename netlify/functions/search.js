const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Decode the Base64 key from the environment variable
const decodedPrivateKey = Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii');

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: decodedPrivateKey, // Use the decoded key here
};

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const PRODUCTS_PER_PAGE = 30; // Or 30, as you set it before

exports.handler = async (event) => {
  const { searchTerm, lastVisible } = event.queryStringParameters;
  
  let q = db.collection("products");

  if (searchTerm && searchTerm.trim() !== "") {
    const lowerCaseSearch = searchTerm.toLowerCase();
    q = q.orderBy("name_lowercase")
      .where("name_lowercase", ">=", lowerCaseSearch)
      .where("name_lowercase", "<=", lowerCaseSearch + '\uf8ff');
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
      body: JSON.stringify({ error: "Failed to fetch products." }),
    };
  }
};
