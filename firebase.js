// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBLf0fZUFGXS9NMS3rMr8Iisy-siAAiIyI",  
  authDomain: "http://kabale-20ec4.firebaseapp.com",  
  projectId: "kabale-20ec4",  
  storageBucket: "http://kabale-20ec4.firebasestorage.app",  
  messagingSenderId: "792218710477",  
  appId: "1:792218710477:web:5a32cc3177ddba98ff5484"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);