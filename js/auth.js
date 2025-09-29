import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification
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
  onSnapshot,
  increment
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getMessaging, onMessage } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBLf0fZUFGXS9NMS3rMr8Iisy-siAAiIyI",
  authDomain: "kabale-20ec4.firebaseapp.com",
  projectId: "kabale-20ec4",
  storageBucket: "kabale-20ec4.appspot.com",
  messagingSenderId: "792218710477",
  appId: "1:792218710477:web:5a32cc3177ddba98ff5484",
  measurementId: "G-5XQRYNC9TW"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const messaging = getMessaging(app);

// Optional: Handle incoming messages while the app is in the foreground
onMessage(messaging, (payload) => {
  console.log('Message received while app is active: ', payload);
  // You can create a custom notification UI instead of an alert
  alert(`New Notification: ${payload.notification.title}`);
});

// Export everything needed by other scripts
export {
  app,
  auth,
  db,
  messaging,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
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
  onSnapshot,
  increment
};
