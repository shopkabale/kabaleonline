// /netlify/functions/verifyOTP.js
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "OK" };

  try {
    const { phone, otp, name } = JSON.parse(event.body);
    const otpDoc = await getDoc(doc(db, "otps", phone));

    if (!otpDoc.exists()) return { statusCode: 400, headers, body: JSON.stringify({ verified: false, message: "No OTP found" }) };
    const data = otpDoc.data();

    if (data.otp == otp) {
      await setDoc(doc(db, "users", phone), {
        name,
        phone,
        verified: true,
        createdAt: new Date()
      });
      await deleteDoc(doc(db, "otps", phone)); // clean up

      return { statusCode: 200, headers, body: JSON.stringify({ verified: true }) };
    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ verified: false }) };
    }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ verified: false, error: err.message }) };
  }
}