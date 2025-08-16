// firebase.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBLf0fZUFGXS9NMS3rMr8Iisy-siAAiIyI", // Use your actual key
  authDomain: "kabale-20ec4.firebaseapp.com",
  projectId: "kabale-20ec4",
  storageBucket: "kabale-20ec4.firebasestorage.app",
  messagingSenderId: "792218710477",
  appId: "1:792218710477:web:5a32cc3177ddba98ff5484",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export the services you'll need in other files
export { auth, db };
