// firebase.js (Complete and Corrected)

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// ✨ NEW: Import messaging functions
import { getMessaging, onMessage } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging.js";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBLf0fZUFGXS9NMS3rMr8Iisy-siAAiIyI",
  authDomain: "kabale-20ec4.firebaseapp.com",
  projectId: "kabale-20ec4",
  storageBucket: "kabale-20ec4.firebasestorage.app",
  messagingSenderId: "792218710477",
  appId: "1:792218710477:web:5a32cc3177ddba98ff5484",
  measurementId: "G-XXXXXXXXXX" // ✅ Add your Measurement ID from Firebase settings
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const messaging = getMessaging(app); // ✨ NEW: Initialize the messaging service

// ✨ NEW: Handle incoming messages when the app is in the foreground (open on screen)
onMessage(messaging, (payload) => {
  console.log('Message received while app is active: ', payload);
  // Here, you could show a custom in-app notification or toast message
  alert(`New Notification: ${payload.notification.title}`);
});


// Export Firebase services and helpers
export {
  app,
  auth,
  db,
  messaging, // ✨ NEW: Export the messaging service
  // Auth helpers (Your original code)
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  // Firestore helpers (Your original code)
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
};
