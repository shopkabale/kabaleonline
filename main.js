// main.js
import { db } from "./firebase.js";
import { collection, query, orderBy, where, limit, getDocs, startAfter } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM Elements
const productGrid = document.getElementById("productGrid");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const searchInput = document.getElementById("searchInput");
const skeletonContainer = document.getElementById("skeletonContainer");

let currentPage = 0;
let totalPages = 0;
let currentSearchTerm = "";
let lastVisibleDoc = null;
let currentTypeFilter = new URLSearchParams(window.location.search).get("type") || null;

// === 🔹 Algolia Fetch with Fallback ===
async function fetchListingsFromAlgolia(searchTerm = "", page = 0) {
  try {
    const response = await fetch(`/.netlify/functions/search?query=${encodeURIComponent(searchTerm)}&page=${page}&type=${currentTypeFilter || ""}`);
    if (!response.ok) throw new Error("Algolia fetch failed");
    const data = await response.json();
    totalPages = data.nbPages;
    return data.hits;
  } catch (error) {
    console.warn("⚠️ Algolia failed, falling back to Firestore:", error);
    return fetchListingsFromFirestore(searchTerm);
  }
}

// === 🔹 Firestore Fallback ===
async function fetchListingsFromFirestore(searchTerm = "") {
  let q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(12));

  if (currentTypeFilter) {
    q = query(collection(db, "products"), where("type", "==", currentTypeFilter), orderBy("createdAt", "desc"), limit(12));
  }

  if (lastVisibleDoc) {
    q = query(q, startAfter(lastVisibleDoc));
  }

  const snapshot = await getDocs(q);
  lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(product => {
      if (searchTerm) {
        return product.title?.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    });
}

// === 🔹 Render Product Card ===
function renderProductCard(product) {
  const isSold = product.isSold ? `<span class="badge badge-danger">Sold</span>` : `<span class="badge badge-success">Available</span>`;

  return `
    <div class="product-card">
      <img src="${product.images?.[0] || '/default.jpg'}" alt="${product.title}">
      <div class="product-info">
        <h3>${product.title}</h3>
        <p>${product.description?.slice(0, 80) || ""}...</p>
        <p><strong>UGX ${product.price?.toLocaleString() || "Negotiable"}</strong></p>
        ${isSold}
      </div>
    </div>
  `;
}

// === 🔹 Load Listings ===
async function loadListings(reset = false) {
  if (reset) {
    productGrid.innerHTML = "";
    currentPage = 0;
    lastVisibleDoc = null;
  }

  skeletonContainer.style.display = "block";

  const products = await fetchListingsFromAlgolia(currentSearchTerm, currentPage);

  skeletonContainer.style.display = "none";

  if (!products || products.length === 0) {
    if (reset) productGrid.innerHTML = "<p>No products found.</p>";
    loadMoreBtn.style.display = "none";
    return;
  }

  products.forEach(product => {
    productGrid.insertAdjacentHTML("beforeend", renderProductCard(product));
  });

  currentPage++;
  loadMoreBtn.style.display = (currentPage < totalPages || lastVisibleDoc) ? "block" : "none";
}

// === 🔹 Event Listeners ===
searchInput?.addEventListener("input", e => {
  currentSearchTerm = e.target.value.trim();
  loadListings(true);
});

loadMoreBtn?.addEventListener("click", () => {
  loadListings();
});

// === 🔹 Init ===
document.addEventListener("DOMContentLoaded", () => {
  loadListings(true);
});