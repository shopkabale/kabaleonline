/**
 * Creates an optimized and transformed Cloudinary URL.
 * @param {string} url The original Cloudinary URL.
 * @param {'thumbnail'|'full'} type The desired transformation type.
 * @returns {string} The new, transformed URL.
 */
function getCloudinaryTransformedUrl(url, type) {
    if (!url || !url.includes('res.cloudinary.com')) {
        // Fallback to a local or placeholder image if Cloudinary URL is invalid
        return url || 'https://placehold.co/400x400/e0e0e0/777?text=No+Image';
    }
    const transformations = {
        thumbnail: 'c_fill,g_auto,w_250,h_250,f_auto,q_auto',
        full: 'c_limit,w_800,h_800,f_auto,q_auto'
    };
    const transformString = transformations[type] || transformations.thumbnail;
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) {
        return url; // Return original if split fails (shouldn't happen with valid Cloudinary URL)
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
const dealsSection = document.getElementById("deals-section"); // Ensure this is in index.html
const dealsGrid = document.getElementById("deals-grid");     // Ensure this is in index.html

// --- State Management ---
let fetching = false;
let lastVisibleDoc = null;

const urlParams = new URLSearchParams(window.location.search);
const listingTypeFilter = urlParams.get("type");
const categoryFilter = urlParams.get("category");
const searchTermFilter = urlParams.get("q"); // For general search

// --- Firestore Fetch (Products for Main Grid) ---
async function fetchMainProducts(isNewSearch = true) {
  let q;
  const baseCollection = collection(db, "products");
  let constraints = [where("isSold", "==", false), orderBy("createdAt", "desc"), limit(12)];

  if (searchTermFilter) {
      // For basic search, you might need a full-text search solution like Algolia or a less efficient Firestore 'array-contains' if you pre-tokenize.
      // For now, we'll just show recent if a general search term is used.
      // More advanced search is outside the scope of simple Firestore queries.
      // A more robust solution for search requires a dedicated search service.
       listingsTitle.textContent = `Search results for "${searchTermFilter}"`;
  } else if (categoryFilter) {
    constraints.unshift(where("category", "==", categoryFilter));
    listingsTitle.textContent = `Items in "${categoryFilter}"`;
    document.title = `Kabale Online | ${categoryFilter}`;
  } else if (listingTypeFilter) {
    constraints.unshift(where("listing_type", "==", listingTypeFilter));
    listingsTitle.textContent = listingTypeFilter === "service" ? "Services" : "Recent Items";
    document.title = `Kabale Online | ${listingTypeFilter === "service" ? "Services" : "Recent Items"}`;
  } else {
    listingsTitle.textContent = "Recent Items";
    document.title = "Kabale Online | #1 Marketplace to Buy, Sell & Rent in Kabale";
  }

  q = query(baseCollection, ...constraints);

  if (!isNewSearch && lastVisibleDoc) {
    q = query(q, startAfter(lastVisibleDoc));
  }

  const snapshot = await getDocs(q);
  lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


// --- Render Products to a Specific Grid ---
function renderProducts(productsToDisplay, isNewRender = false, targetGrid) {
  if (!targetGrid) return; // Defensive check

  if (isNewRender) targetGrid.innerHTML = ""; // Clear existing only on new fetches

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

// --- Fetch & Render Main Products ---
async function fetchAndRenderMainProducts(isNewSearch = true) {
  if (fetching) return;
  fetching = true;
  if(loadMoreBtn) loadMoreBtn.disabled = true;

  if (isNewSearch) {
    if(productGrid) productGrid.innerHTML = '';
    if(loadMoreBtn) loadMoreBtn.style.display = "none";
    lastVisibleDoc = null;
  } else {
    if(loadMoreBtn) loadMoreBtn.textContent = "Loading more...";
  }

  try {
    const products = await fetchMainProducts(isNewSearch);

    if (products.length === 0 && isNewSearch) {
      if(productGrid) productGrid.innerHTML = "<p>No listings match your criteria.</p>";
    } else {
      renderProducts(products, isNewSearch, productGrid);
    }

    if (products.length === 12) { // If we got the limit, there might be more
      if(loadMoreBtn) loadMoreBtn.style.display = "block";
    } else {
      if(loadMoreBtn) loadMoreBtn.style.display = "none";
    }
  } catch (error) {
    console.error("Error fetching main products:", error);
    if (isNewSearch && productGrid) {
      productGrid.innerHTML = `<p>Sorry, could not load listings. Please try again later.</p>`;
    }
  } finally {
    fetching = false;
    if(loadMoreBtn) {
      loadMoreBtn.textContent = "Load More";
      loadMoreBtn.disabled = false;
    }
  }
}

// --- NEW: Fetch & Render Deals ---
async function fetchDeals() {
    if (!dealsGrid || !dealsSection) {
        console.warn("Deals grid or section not found on page.");
        return;
    }
    
    // Hide initially, show only if deals are found
    dealsSection.style.display = 'none';

    try {
        const dealsQuery = query(
            collection(db, 'products'),
            where('isDeal', '==', true),
            where('isSold', '==', false),
            orderBy('createdAt', 'desc'), // Use createdAt or a specific 'dealPriority' field
            limit(8) // Limit number of deals shown
        );
        const snapshot = await getDocs(dealsQuery);

        if (snapshot.empty) {
            console.log("No deals found.");
            dealsSection.style.display = 'none';
            return;
        }
        
        const deals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts(deals, true, dealsGrid); // isNewRender = true to clear previous content
        dealsSection.style.display = 'block'; // Only show if deals are present

    } catch (error) {
        console.error("Error fetching deals:", error);
        dealsSection.style.display = 'none'; // Ensure it's hidden on error
    }
}

// --- Dynamic Testimonials ---
async function fetchTestimonials() {
    const testimonialGrid = document.getElementById('testimonial-grid');
    if (!testimonialGrid) return;

    try {
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
    const searchTerm = searchInput.value.trim();
    if (searchTerm !== "") {
         window.location.href = `/?q=${encodeURIComponent(searchTerm)}`;
    } else {
        // If search input is empty, clear search filter and reload
        window.location.href = `/`; 
    }
}

// --- Event Listeners ---
if (searchBtn) searchBtn.addEventListener("click", handleNewSearch);
if (searchInput) searchInput.addEventListener("keydown", e => e.key === "Enter" && handleNewSearch(e));
if (loadMoreBtn) loadMoreBtn.addEventListener("click", () => fetchAndRenderMainProducts(false));

// --- Init on DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
    fetchDeals(); // Fetch deals first
    fetchAndRenderMainProducts(true); // Then main products
    fetchTestimonials(); // Then testimonials
});
