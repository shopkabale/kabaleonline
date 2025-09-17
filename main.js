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
const dealsSection = document.getElementById("deals-section");
const dealsGrid = document.getElementById("deals-grid");


// --- State Management ---
let fetching = false;
let lastVisibleDoc = null;

const urlParams = new URLSearchParams(window.location.search);
const listingTypeFilter = urlParams.get("type");
const categoryFilter = urlParams.get("category");

// --- Firestore Fetch (Products) ---
async function fetchFromFirestore(isNewSearch = true) {
  let q;
  const baseCollection = collection(db, "products");
  const baseConstraints = [where("isSold", "==", false), orderBy("createdAt", "desc"), limit(12)];

  if (categoryFilter) {
    q = query(baseCollection, where("category", "==", categoryFilter), ...baseConstraints);
  } else if (listingTypeFilter) {
    q = query(baseCollection, where("listing_type", "==", listingTypeFilter), ...baseConstraints);
  } else {
    q = query(baseCollection, ...baseConstraints);
  }

  if (!isNewSearch && lastVisibleDoc) {
    q = query(q, startAfter(lastVisibleDoc));
  }

  const snapshot = await getDocs(q);
  lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


// --- Render Products ---
function renderProducts(productsToDisplay, isNewSearch = false, targetGrid = productGrid) {
  if (isNewSearch) targetGrid.innerHTML = "";

  const fragment = document.createDocumentFragment();
  productsToDisplay.forEach(product => {
    const originalImage = product.imageUrls?.[0] || "https://placehold.co/400x400/e0e0e0/777?text=No+Image";
    const thumbnailUrl = getCloudinaryTransformedUrl(originalImage, 'thumbnail');

    const productLink = document.createElement("a");
    productLink.href = `/product.html?id=${product.id}`;
    productLink.className = "product-card-link";

    productLink.innerHTML = `
      <div class="product-card">
        <img src="${thumbnailUrl}" alt="${product.name}" loading="lazy">
        <h3>${product.name}</h3>
        <p class="price">UGX ${product.price ? product.price.toLocaleString() : "N/A"}</p>
      </div>
    `;
    fragment.appendChild(productLink);
  });
  targetGrid.appendChild(fragment);
}

// --- Fetch Products Controller ---
async function fetchProducts(isNewSearch = true) {
  if (fetching) return;
  fetching = true;
  loadMoreBtn.disabled = true;

  if (isNewSearch) {
    productGrid.innerHTML = '';
    loadMoreBtn.style.display = "none";
    lastVisibleDoc = null;
  } else {
    loadMoreBtn.textContent = "Loading more...";
  }

  try {
    const products = await fetchFromFirestore(isNewSearch);

    if (products.length === 0 && isNewSearch) {
      productGrid.innerHTML = "<p>No listings match your criteria.</p>";
    } else {
      renderProducts(products, isNewSearch);
    }

    if (products.length === 12) {
      loadMoreBtn.style.display = "block";
    } else {
      loadMoreBtn.style.display = "none";
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    if (isNewSearch) {
      productGrid.innerHTML = `<p>Sorry, could not load listings. Please try again later.</p>`;
    }
  } finally {
    fetching = false;
    loadMoreBtn.textContent = "Load More";
    loadMoreBtn.disabled = false;
  }
}

// --- NEW: Fetch Deals ---
async function fetchDeals() {
    if (!dealsGrid || !dealsSection) return;
    try {
        const dealsQuery = query(
            collection(db, 'products'),
            where('isDeal', '==', true),
            where('isSold', '==', false),
            orderBy('createdAt', 'desc'),
            limit(8)
        );
        const snapshot = await getDocs(dealsQuery);

        if (snapshot.empty) {
            dealsSection.style.display = 'none';
            return;
        }
        
        const deals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts(deals, true, dealsGrid);
        dealsSection.style.display = 'block';

    } catch (error) {
        console.error("Error fetching deals:", error);
        dealsSection.style.display = 'none';
    }
}

// --- Dynamic Testimonials ---
async function fetchTestimonials() {
    const testimonialGrid = document.getElementById('testimonial-grid');
    if (!testimonialGrid) return;

    try {
        // MODIFIED: This query now only gets approved testimonials
        const testimonialsQuery = query(
            collection(db, 'testimonials'), 
            where('status', '==', 'approved'),
            orderBy('order', 'asc'), 
            limit(2)
        );
        const querySnapshot = await getDocs(testimonialsQuery);

        if (querySnapshot.empty) {
            testimonialGrid.closest('.testimonial-section').style.display = 'none';
            return;
        }

        testimonialGrid.innerHTML = '';
        querySnapshot.forEach(doc => {
            const testimonial = doc.data();
            const card = document.createElement('div');
            card.className = 'testimonial-card';
            card.innerHTML = `
                <p class="testimonial-text">"${testimonial.quote}"</p>
                <p class="testimonial-author">&ndash; ${testimonial.authorName} <span>${testimonial.authorDetail || ''}</span></p>
            `;
            testimonialGrid.appendChild(card);
        });

    } catch (error) {
        console.error("Error fetching testimonials:", error);
        testimonialGrid.closest('.testimonial-section').style.display = 'none';
    }
}

// --- Search Handler ---
function handleNewSearch(event) {
    event.preventDefault();
    const searchTerm = searchInput.value;
    if (searchTerm.trim() !== "") {
         window.location.href = `/?q=${encodeURIComponent(searchTerm)}`;
    }
}

if (searchBtn) searchBtn.addEventListener("click", handleNewSearch);
if (searchInput) searchInput.addEventListener("keydown", e => e.key === "Enter" && handleNewSearch(e));
if (loadMoreBtn) loadMoreBtn.addEventListener("click", () => fetchProducts(false));

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    if (categoryFilter) {
      listingsTitle.textContent = `Items in "${categoryFilter}"`;
      document.title = `Kabale Online | ${categoryFilter}`;
    } else if (listingTypeFilter === "service") {
      listingsTitle.textContent = "Services";
      document.title = "Kabale Online | Services";
    }

    fetchDeals(); // Fetch deals for the carousel
    fetchProducts(true);
    fetchTestimonials();
});
