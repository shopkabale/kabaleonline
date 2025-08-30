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

// Helper function to generate keywords from text
const generateKeywords = (text) => {
  if (!text) return []; // Return empty array if text is null or undefined
  const textLower = text.toLowerCase();
  const keywords = new Set();
  const words = textLower.split(' ').filter(word => word.length > 0);
  for (const word of words) {
    for (let i = 1; i <= word.length; i++) {
      keywords.add(word.substring(0, i));
    }
  }
  return Array.from(keywords);
};

exports.handler = async (event) => {
  try {
    const snapshot = await db.collection('products').get();
    if (snapshot.empty) {
      return { statusCode: 200, body: "No products found to update." };
    }

    const updatePromises = [];
    let updatedCount = 0;

    snapshot.forEach(doc => {
      const productData = doc.data();
      
      // Only update the product if it does NOT already have a keywords field.
      if (!productData.keywords) {
        const textToSearch = `${productData.name} ${productData.category}`;
        const keywords = generateKeywords(textToSearch);
        
        updatePromises.push(doc.ref.update({ keywords: keywords }));
        updatedCount++;
      }
    });

    if (updatedCount === 0) {
      return { statusCode: 200, body: "All products already have keywords. Nothing to do." };
    }

    // Wait for all the updates to complete
    await Promise.all(updatePromises);
    
    const successMessage = `Successfully updated ${updatedCount} products with keywords. You can now delete this script file.`;
    console.log(successMessage);
    return { statusCode: 200, body: successMessage };

  } catch (error)
 {
    console.error("Error updating products:", error);
    return { statusCode: 500, body: `An error occurred: ${error.message}` };
  }
};
