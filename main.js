/**
 * Creates an optimized and transformed Cloudinary URL.
 * @param {string} url The original Cloudinary URL.
 * @param {'thumbnail'|'full'} type The desired transformation type.
 * @returns {string} The new, transformed URL.
 */
function getCloudinaryTransformedUrl(url, type) {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || 'https://placehold.co/400x400/e0e0e0/777?text=No+Image';
    }
    const transformations = {
        thumbnail: 'c_fill,g_auto,w_250,h_250,f_auto,q_auto',
        full: 'c_limit,w_800,h_800,f_auto,q_auto'
    };
    const transformString = transformations[type] || transformations.thumbnail;
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) {
        return url;
    }
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}


import { db } from "./firebase.js";
import { collection, query, orderBy, where, limit, getDocs, startAfter } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM Element References ---
const productGrid = document.getElementById("product-grid");
const searchInput = document.getElementById("search-input");
const listingsTitle = document.getElementById("listings-title");
const searchBtn = document.getElementById("search-btn");
const loadMoreBtn = document.getElementById("load-more-btn");

// --- State Management ---
let fetching = false;
let currentSearchTerm = "";
let lastVisibleDoc = null;

const urlParams = new URLSearchParams(window.location.search);
const listingTypeFilter = urlParams.get("type");
const categoryFilter = urlParams.get("category"); // Added for category filtering

// --- Skeleton Loader ---
function renderSkeletonLoaders(count) {
  if (!productGrid) return;
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

// --- Firestore Fetch (Now handles all filtering) ---
async function fetchFromFirestore(isNewSearch = true) {
  let q;
  const baseCollection = collection(db, "products");

  // Build the query based on filters
  if (categoryFilter) {
    q = query(baseCollection, where("category", "==", categoryFilter), orderBy("createdAt", "desc"), limit(12));
  } else if (listingTypeFilter) {
    q = query(baseCollection, where("listing_type", "==", listingTypeFilter), orderBy("createdAt", "desc"), limit(12));
  } else {
    q = query(baseCollection, orderBy("createdAt", "desc"), limit(12));
  }

  // Handle pagination
  if (!isNewSearch && lastVisibleDoc) {
    q = query(q, startAfter(lastVisibleDoc));
  }

  const snapshot = await getDocs(q);
  lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1]; // Update last visible doc

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


// --- Render Products ---
function renderProducts(productsToDisplay, isNewSearch = false) {
  if (isNewSearch) productGrid.innerHTML = "";

  const fragment = document.createDocumentFragment();
  productsToDisplay.forEach(product => {
    const originalImage = product.imageUrls?.[0] || "https://placehold.co/400x400/e0e0e0/777?text=No+Image";
    const thumbnailUrl = getCloudinaryTransformedUrl(originalImage, 'thumbnail');
    const isSold = product.isSold || false;

    const productLink = document.createElement("a");
    productLink.href = `/product.html?id=${product.id}`;
    productLink.className = "product-card-link";

    productLink.innerHTML = `
      <div class="product-card ${isSold ? "is-sold" : ""}">
        ${isSold ? '<div class="sold-out-tag">SOLD</div>' : ""}
        <img src="${thumbnailUrl}" alt="${product.name}" loading="lazy">
        <h3>${product.name}</h3>
        <p class="price">UGX ${product.price ? product.price.toLocaleString() : "N/A"}</p>
      </div>
    `;
    fragment.appendChild(productLink);
  });
  productGrid.appendChild(fragment);
}

// --- Fetch Products Controller ---
async function fetchProducts(isNewSearch = true) {
  if (fetching) return;
  fetching = true;
  loadMoreBtn.disabled = true;

  if (isNewSearch) {
    renderSkeletonLoaders(12);
    loadMoreBtn.style.display = "none";
    lastVisibleDoc = null;
  } else {
    loadMoreBtn.textContent = "Loading more...";
  }

  try {
    // Simplified to always use the powerful Firestore fetch function
    const products = await fetchFromFirestore(isNewSearch);

    if (products.length === 0 && isNewSearch) {
      productGrid.innerHTML = "<p>No listings match your criteria.</p>";
    } else {
      renderProducts(products, isNewSearch);
    }

    if (products.length === 12) { // If we got a full page, there might be more
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

// --- NEW: Dynamic Testimonials ---
async function fetchTestimonials() {
    const testimonialGrid = document.getElementById('testimonial-grid');
    if (!testimonialGrid) return;

    try {
        const testimonialsQuery = query(collection(db, 'testimonials'), orderBy('order', 'asc'), limit(2));
        const querySnapshot = await getDocs(testimonialsQuery);

        if (querySnapshot.empty) {
            testimonialGrid.closest('.testimonial-section').style.display = 'none';
            return;
        }

        testimonialGrid.innerHTML = ''; // Clear any hard-coded content
        querySnapshot.forEach(doc => {
            const testimonial = doc.data();
            const card = document.createElement('div');
            card.className = 'testimonial-card';
            card.innerHTML = `
                <p class="testimonial-text">"${testimonial.quote}"</p>
                <p class="testimonial-author">&ndash; ${testimonial.authorName} <span>${testimonial.authorDetail}</span></p>
            `;
            testimonialGrid.appendChild(card);
        });

    } catch (error) {
        console.error("Error fetching testimonials:", error);
        testimonialGrid.closest('.testimonial-section').style.display = 'none';
    }
}

// --- Search Handlers ---
function handleNewSearch(event) {
    // This function will just reload the page with search parameters,
    // allowing our main fetchProducts function to handle the logic.
    event.preventDefault();
    const searchTerm = searchInput.value;
    // For now, search will redirect to a general search or you can build a dedicated search page
    // A simple implementation is to just filter on the homepage
    window.location.href = `/?q=${encodeURIComponent(searchTerm)}`;
}

if (searchBtn) {
    searchBtn.addEventListener("click", handleNewSearch);
}
if (searchInput) {
    searchInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            handleNewSearch(e);
        }
    });
}

if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => fetchProducts(false));
}


// --- Init ---
// This runs when the page is first loaded
document.addEventListener('DOMContentLoaded', () => {
    if (categoryFilter) {
      listingsTitle.textContent = `Items in "${categoryFilter}"`;
      document.title = `Kabale Online | ${categoryFilter}`;
    } else if (listingTypeFilter === "service") {
      listingsTitle.textContent = "Services";
      document.title = "Kabale Online | Services";
    } else {
      listingsTitle.textContent = "All Items";
    }

    fetchProducts(true); // Fetch products based on URL
    fetchTestimonials(); // Fetch testimonials for the homepage
});
