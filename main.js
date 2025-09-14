// main.js
import { db } from "./firebase.js";
import { collection, query, orderBy, where, limit, getDocs, startAfter } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM Element References ---
const productGrid = document.getElementById("product-grid");
const searchInput = document.getElementById("search-input");
const listingsTitle = document.getElementById("listings-title");
const searchBtn = document.getElementById("search-btn");
const loadMoreBtn = document.getElementById("load-more-btn");

// --- State Management ---
let currentPage = 0;
let fetching = false;
let currentSearchTerm = "";
let totalPages = 0;
let lastVisibleDoc = null;

const urlParams = new URLSearchParams(window.location.search);
const listingTypeFilter = urlParams.get("type");

// --- Skeleton Loader ---
function renderSkeletonLoaders(count) {
  let skeletons = "";
  for (let i = 0; i < count; i++) {
    skeletons += `
      <div class="skeleton-card">
        <div class="skeleton-image"></div>
        <div class="skeleton-text">
          <div class="skeleton-line"></div>
          <div class="skeleton-line skeleton-line-short"></div>
        </div>
      </div>
    `;
  }
  productGrid.innerHTML = skeletons;
}

// --- Algolia Fetch with Fallback ---
async function fetchFromAlgolia(page = 0) {
  let url = `/.netlify/functions/search?searchTerm=${encodeURIComponent(currentSearchTerm)}&page=${page}`;
  if (listingTypeFilter) {
    url += `&type=${listingTypeFilter}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`Algolia error: ${response.status} - ${errorBody.error}`);
    }
    return await response.json();
  } catch (err) {
    console.warn("⚠️ Algolia fetch failed, using Firestore fallback:", err);
    return { products: await fetchFromFirestore(), totalPages: 1 };
  }
}

// --- Firestore Fallback ---
async function fetchFromFirestore() {
  let q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(12));

  if (listingTypeFilter) {
    q = query(
      collection(db, "products"),
      where("type", "==", listingTypeFilter),
      orderBy("createdAt", "desc"),
      limit(12)
    );
  }

  if (lastVisibleDoc) {
    q = query(q, startAfter(lastVisibleDoc));
  }

  const snapshot = await getDocs(q);
  lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];

  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(product => {
      if (currentSearchTerm) {
        return product.title?.toLowerCase().includes(currentSearchTerm.toLowerCase());
      }
      return true;
    });
}

// --- Render Products ---
function renderProducts(productsToDisplay, isNewSearch = false) {
  if (isNewSearch) productGrid.innerHTML = "";

  const fragment = document.createDocumentFragment();
  productsToDisplay.forEach(product => {
    const primaryImage =
      product.images?.[0] ||
      product.imageUrls?.[0] ||
      "https://placehold.co/400x400/e0e0e0/777?text=No+Image";

    const isSold = product.isSold || false;

    let sellerInfoHtml = "";
    if (product.sellerName) {
      sellerInfoHtml = `<p class="seller-info">By: ${product.sellerName}</p>`;
    }

    const productLink = document.createElement("a");
    if (isSold) {
      productLink.href = "javascript:void(0)";
      productLink.style.cursor = "default";
    } else {
      productLink.href = `product.html?id=${product.id}`;
    }
    productLink.className = "product-card-link";

    productLink.innerHTML = `
      <div class="product-card ${isSold ? "is-sold" : ""}">
        ${isSold ? '<div class="sold-out-tag">SOLD</div>' : ""}
        <img src="${primaryImage}" alt="${product.title || product.name}" loading="lazy"
          onerror="this.src='https://placehold.co/400x400/e0e0e0/777?text=Error'">
        <h3>${product.title || product.name}</h3>
        <p class="price">UGX ${product.price ? product.price.toLocaleString() : "Negotiable"}</p>
        ${sellerInfoHtml}
      </div>
    `;
    fragment.appendChild(productLink);
  });
  productGrid.appendChild(fragment);
}

// --- Fetch Products Controller ---
async function fetchProducts(isNewSearch = false) {
  if (fetching) return;
  fetching = true;
  loadMoreBtn.disabled = true;

  if (isNewSearch) {
    renderSkeletonLoaders(12);
    loadMoreBtn.style.display = "none";
    currentPage = 0;
    lastVisibleDoc = null;
  } else {
    loadMoreBtn.textContent = "Loading more...";
  }

  try {
    const data = await fetchFromAlgolia(currentPage);
    const products = data.products || [];
    totalPages = data.totalPages || 1;

    if (products.length === 0 && isNewSearch) {
      productGrid.innerHTML = "<p>No listings match your criteria.</p>";
    } else {
      renderProducts(products, isNewSearch);
    }

    if (currentPage + 1 < totalPages || lastVisibleDoc) {
      loadMoreBtn.style.display = "block";
    } else {
      loadMoreBtn.style.display = "none";
    }
  } catch (error) {
    console.error("--- DETAILED FETCH ERROR ---", error);
    if (isNewSearch) {
      productGrid.innerHTML = `<p>Sorry, could not load listings. Please try again later.</p>`;
    }
  } finally {
    fetching = false;
    loadMoreBtn.textContent = "Load More";
    loadMoreBtn.disabled = false;
  }
}

// --- Search Handlers ---
function handleNewSearch() {
  currentSearchTerm = searchInput.value;
  fetchProducts(true);
}

searchBtn?.addEventListener("click", handleNewSearch);
searchInput?.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleNewSearch();
  }
});

loadMoreBtn?.addEventListener("click", () => {
  currentPage++;
  fetchProducts(false);
});

// --- Init ---
if (listingTypeFilter === "service") {
  listingsTitle.textContent = "Services";
  document.title = "Kabale Online | Services";
} else {
  listingsTitle.textContent = "All Items";
}

fetchProducts(true);