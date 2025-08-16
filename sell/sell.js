import { auth, db } from "../firebase.js";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
  collection, addDoc, query, where, getDocs, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");
const dashboard = document.getElementById("dashboard");
const authSection = document.getElementById("auth-section");

const productName = document.getElementById("productName");
const productPrice = document.getElementById("productPrice");
const postProductBtn = document.getElementById("postProductBtn");
const productList = document.getElementById("productList");

// 🔹 Sign Up
signupBtn.addEventListener("click", async () => {
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    alert("Account created successfully!");
  } catch (error) {
    alert(error.message);
  }
});

// 🔹 Login
loginBtn.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    alert("Login successful!");
  } catch (error) {
    alert(error.message);
  }
});

// 🔹 Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// 🔹 Track login state
onAuthStateChanged(auth, (user) => {
  if (user) {
    authSection.style.display = "none";
    dashboard.style.display = "block";
    loadProducts(user.uid);
  } else {
    authSection.style.display = "block";
    dashboard.style.display = "none";
  }
});

// 🔹 Post product
postProductBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Please login first.");

  await addDoc(collection(db, "products"), {
    name: productName.value,
    price: productPrice.value,
    sellerId: user.uid,
  });

  productName.value = "";
  productPrice.value = "";
  loadProducts(user.uid);
});

// 🔹 Load seller’s products
async function loadProducts(uid) {
  productList.innerHTML = "";
  const q = query(collection(db, "products"), where("sellerId", "==", uid));
  const snap = await getDocs(q);

  snap.forEach((docSnap) => {
    const li = document.createElement("li");
    li.textContent = `${docSnap.data().name} - $${docSnap.data().price}`;

    // Delete button
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.onclick = async () => {
      await deleteDoc(doc(db, "products", docSnap.id));
      loadProducts(uid);
    };

    li.appendChild(delBtn);
    productList.appendChild(li);
  });
}