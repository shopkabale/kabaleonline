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
  const headers = { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*' // Allow it to be called from anywhere
  };
  
  // Handle pre-flight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // 1. Get all documents from your 'users' collection
    const snapshot = await db.collection('users').get();

    if (snapshot.empty) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "No users found to update." })
      };
    }

    let writeCount = 0;
    const writePromises = [];

    // 2. Loop through every user
    snapshot.forEach(doc => {
      const data = doc.data();
      const userId = doc.id;

      // 3. Get the required data from the user document
      const referralCode = data.referralCode;
      const userEmail = data.email;

      // 4. Check if the user has a referral code AND an email
      if (referralCode && typeof referralCode === 'string' && userEmail) {
        
        // 5. Get a reference to the new doc in 'referralCodes'
        const codeRef = db.collection('referralCodes').doc(referralCode);
        
        // 6. Add a 'set' operation to our list.
        // 'set' will create or overwrite, which is perfect.
        writePromises.push(
          codeRef.set({
            userId: userId,
            userEmail: userEmail
          })
        );
        writeCount++;
      }
    });

    if (writePromises.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "No users had referral codes to backfill." })
      };
    }

    // 7. Run all writes at the same time
    await Promise.all(writePromises);

    // 8. Report success
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: `Successfully created or updated ${writeCount} lookup codes in 'referralCodes'.`,
        success: true 
      })
    };

  } catch (error) {
    console.error('Error backfilling referral codes:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};