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

exports.handler = async (event) => {
  try {
    const dealsQuery = db.collection("products")
      .where("isDeal", "==", true) 
      .orderBy("createdAt", "desc") // CORRECTED to use 'createdAt'
      .limit(10);

    const snapshot = await dealsQuery.get();
    const deals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deals),
    };
  } catch (error) {
    console.error("Fetch-deals function error:", error);
    const errorMessage = error.message.includes("indexes")
      ? "Query requires a Firestore index for 'createdAt'. Please check your Firebase console."
      : "Failed to fetch deals.";
    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMessage, details: error.message }),
    };
  }
};
