// /sell/sell.js
import { auth, db } from "../firebase.js";
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection, addDoc, serverTimestamp, query, where, orderBy,
  onSnapshot, deleteDoc, doc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/* ---------------- Utils ---------------- */

const MAX_FILE_MB = 2;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BAD_WORDS = ["scam", "fraud", "sex", "nude"]; // keep short/local; expand later

function normalizeWhatsApp(phone) {
  if (!phone) return "";
  let s = String(phone).trim();
  // remove spaces, dashes, parentheses, leading '+'
  s = s.replace(/[^\d]/g, "");
  // Ugandan numbers
  if (s.startsWith("256") && s.length === 12) return s;
  if (s.startsWith("0") && s.length === 10) return "256" + s.slice(1);
  if (s.length === 9) return "256" + s; // e.g., 740xxxxxx
  return s; // fallback
}

function hasBadWords(text) {
  const t = (text || "").toLowerCase();
  return BAD_WORDS.some(w => t.includes(w));
}

function validateImageFile(file) {
  if (!file) throw new Error("Image is required.");
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Only JPG/PNG/WebP allowed.");
  const mb = file.size / (1024 * 1024);
  if (mb > MAX_FILE_MB) throw new Error(`Image too large (max ${MAX_FILE_MB}MB).`);
}

/* -------------- Cloudinary (signed) -------------- */

async function getCloudinarySignature() {
  const res = await fetch("/.netlify/functions/sign-cloudinary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folder: "kabaleonline/products",
      moderation: "manual",
      context: "app=KabaleOnline"
    })
  });
  if (!res.ok) throw new Error("Cloudinary signature failed.");
  return res.json();
}

async function uploadToCloudinary(file) {
  validateImageFile(file);
  const sig = await getCloudinarySignature();

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", sig.timestamp);
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);
  form.append("upload_preset", sig.upload_preset);
  form.append("moderation", sig.moderation);
  form.append("context", sig.context);

  const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;
  const res = await fetch(endpoint, { method: "POST", body: form });
  const json = await res.json();
  if (!json.secure_url) throw new Error("Cloudinary upload error.");
  return {
    url: json.secure_url,
    moderation: json.moderation || [], // array if enabled
  };
}

/* -------------- Auth + UI -------------- */

const authForm = document.getElementById("auth-form");
const emailEl = document.getElementById("auth-email");
const passEl = document.getElementById("auth-password");
const loginBtn = document.getElementById("btn-login");
const signupBtn = document.getElementById("btn-signup");
const logoutBtn = document.getElementById("btn-logout");
const authMsg = document.getElementById("auth-msg");

const postSection = document.getElementById("post-section");
const mineSection = document.getElementById("mine-section");
const form = document.getElementById("product-form");
const formMsg = document.getElementById("form-msg");
const myProducts = document.getElementById("my-products");

function setLoggedInUI(isLoggedIn) {
  postSection.style.display = isLoggedIn ? "" : "none";
  mineSection.style.display = isLoggedIn ? "" : "none";
  logoutBtn.style.display = isLoggedIn ? "" : "none";
}

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await signInWithEmailAndPassword(auth, emailEl.value, passEl.value);
    authMsg.textContent = "Logged in.";
  } catch (err) {
    authMsg.textContent = err.message;
  }
});
signupBtn.addEventListener("click", async () => {
  try {
    await createUserWithEmailAndPassword(auth, emailEl.value, passEl.value);
    authMsg.textContent = "Account created & logged in.";
  } catch (err) {
    authMsg.textContent = err.message;
  }
});
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  authMsg.textContent = "Logged out.";
});

onAuthStateChanged(auth, (user) => {
  setLoggedInUI(!!user);
  if (user) listenMyProducts(user.uid);
  else if (window.unsubscribeMine) { window.unsubscribeMine(); myProducts.innerHTML = ""; }
});

/* -------------- Create -------------- */

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formMsg.textContent = "";
  const user = auth.currentUser;
  if (!user) return (formMsg.textContent = "Please log in.");

  const title = document.getElementById("title").value.trim();
  const price = Number(document.getElementById("price").value);
  const category = document.getElementById("category").value;
  const description = document.getElementById("description").value.trim();
  const sellerName = document.getElementById("sellerName").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const imageFile = document.getElementById("imageFile").files[0];

  // basic moderation
  if (hasBadWords(title) || hasBadWords(description)) {
    return (formMsg.textContent = "Your text seems inappropriate. Please revise.");
  }

  try {
    formMsg.textContent = "Uploading image...";
    const { url, moderation } = await uploadToCloudinary(imageFile);

    const flagged = Array.isArray(moderation) && moderation.some(m => m.status === "rejected");
    const approved = !flagged; // you can force false if you want manual reviews first

    formMsg.textContent = "Saving product...";
    await addDoc(collection(db, "products"), {
      title, price, category, description,
      sellerName, phone,
      imageUrl: url,
      isSponsored: false, isVerified: false, onSale: false,
      ownerUid: user.uid,
      publishDate: serverTimestamp(),
      approved, flagged
    });
    form.reset();
    formMsg.textContent = flagged
      ? "Product saved but flagged; an admin will review."
      : "Product posted!";
  } catch (err) {
    formMsg.textContent = err.message;
  }
});

/* -------------- Read (mine) + Edit + Delete -------------- */

function listenMyProducts(uid) {
  if (window.unsubscribeMine) window.unsubscribeMine();
  const q = query(
    collection(db, "products"),
    where("ownerUid", "==", uid),
    orderBy("publishDate", "desc")
  );
  window.unsubscribeMine = onSnapshot(q, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    myProducts.innerHTML = items.map(cardEditable).join("") || "<p>No products yet.</p>";
    bindRowActions();
  });
}

function cardEditable(p) {
  const wnum = normalizeWhatsApp(p.phone);
  return `
    <div class="product-card">
      <img src="${p.imageUrl}" alt="${p.title}">
      <div class="product-body">
        <input class="ed title" data-id="${p.id}" value="${escapeHtml(p.title)}">
        <input class="ed price" data-id="${p.id}" type="number" value="${p.price}">
        <input class="ed category" data-id="${p.id}" value="${escapeHtml(p.category)}">
        <textarea class="ed description" data-id="${p.id}">${escapeHtml(p.description || "")}</textarea>
        <input class="ed phone" data-id="${p.id}" value="${escapeHtml(p.phone || "")}" placeholder="07.. or 256..">
        <div class="row">
          <a class="whatsapp" href="https://wa.me/${wnum}?text=${encodeURIComponent(`Hello, I'm interested in "${p.title}" on KabaleOnline.`)}" target="_blank">WhatsApp Purchase</a>
          <button class="btn-save" data-id="${p.id}">Save</button>
          <button class="btn-delete" data-id="${p.id}">Delete</button>
        </div>
        ${p.flagged ? '<p class="small" style="color:#e91e63">Flagged for review</p>' : ""}
      </div>
    </div>
  `;
}

function bindRowActions() {
  // Save edits
  document.querySelectorAll(".btn-save").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const parent = btn.closest(".product-card");
      const title = parent.querySelector(".ed.title").value.trim();
      const price = Number(parent.querySelector(".ed.price").value);
      const category = parent.querySelector(".ed.category").value.trim();
      const description = parent.querySelector(".ed.description").value.trim();
      const phone = parent.querySelector(".ed.phone").value.trim();

      if (hasBadWords(title) || hasBadWords(description)) {
        return alert("Text seems inappropriate. Please revise.");
      }
      try {
        await updateDoc(doc(db, "products", id), { title, price, category, description, phone });
        alert("Saved.");
      } catch (e) { alert(e.message); }
    });
  });

  // Delete
  document.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!confirm("Delete this product?")) return;
      try { await deleteDoc(doc(db, "products", id)); }
      catch (e) { alert(e.message); }
    });
  });
}

function escapeHtml(s=""){ return s.replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c])); }
