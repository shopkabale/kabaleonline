const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

exports.handler = async (event) => {
  try {
    // Create a query to get products where isOnDeal is true
    const dealsQuery = db.collection("products")
      .where("isOnDeal", "==", true)
      .orderBy("createdAt", "desc") // Show newest deals first
      .limit(10); // Limit to a maximum of 10 deals

    const snapshot = await dealsQuery.get();
    
    if (snapshot.empty) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([]), // Return an empty array if no deals are found
      };
    }

    const deals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deals),
    };

  } catch (error) {
    console.error("Fetch-deals function error:", error);
    // Firestore often gives specific errors for bad queries.
    const errorMessage = error.message.includes("indexes")
      ? "Query requires a Firestore index. Please check your Firebase console for an automatic index creation link."
      : "Failed to fetch deals.";
      
    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMessage, details: error.message }),
    };
  }
};
