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
  const headers = { 'Content-Type': 'application/json' };

  try {
    // 1. Get all documents from your 'products' collection
    //    !! IMPORTANT: If you named your collection something else, change 'products' below !!
    const snapshot = await db.collection('products').get();

    if (snapshot.empty) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "No products found to update." })
      };
    }

    let updatedCount = 0;
    const updatePromises = [];

    // 2. Loop through every product
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // 3. Check if the 'views' field is missing
      if (data.views === undefined) {
        // 4. If it's missing, add an update operation to our list
        updatedCount++;
        updatePromises.push(doc.ref.update({ views: 0 }));
      }
    });

    if (updatePromises.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "All products already have a 'views' field." })
      };
    }

    // 5. Run all updates at the same time
    await Promise.all(updatePromises);

    // 6. Report success
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: `Successfully updated ${updatedCount} products.`,
        success: true 
      })
    };

  } catch (error) {
    console.error('Error backfilling views:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};