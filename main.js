import { db } from './firebase.js';
import { collection, query, where, getDocs, orderBy, startAfter, limit } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const listingsContainer = document.getElementById('listings-container');
const listingsTitle = document.getElementById('listings-title');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');

let currentPage = 1;
const pageSize = 12;
let currentFilters = {};
let lastVisibleDoc = null;
let firstVisibleDoc = null;

// Convert string for comparison ignoring case
const normalize = str => str ? str.toLowerCase().trim() : '';

// Fetch listings with filters & pagination
async function fetchListings(page = 1, category = null, type = null) {
    let q;
    let filters = [];

    currentFilters = { category, type };

    // Fetch all products
    q = query(
        collection(db, 'products'),
        orderBy('createdAt', 'desc'),
        limit(pageSize * page)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        listingsContainer.innerHTML = "<p>No listings found.</p>";
        listingsTitle.textContent = category || type || "All Listings";
        return;
    }

    // Filter manually since Firestore doesn't support OR/Case-insensitive easily
    let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (category) {
        products = products.filter(p => normalize(p.category) === normalize(category));
    }
    if (type) {
        products = products.filter(p => normalize(p.listing_type) === normalize(type));
    }

    // Pagination slice
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginated = products.slice(start, end);

    listingsContainer.innerHTML = '';
    if (paginated.length === 0) {
        listingsContainer.innerHTML = "<p>No listings found on this page.</p>";
        listingsTitle.textContent = category || type || "All Listings";
        return;
    }

    paginated.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'listing-card';
        productCard.innerHTML = `
            <img src="${product.imageUrls && product.imageUrls[0] ? product.imageUrls[0] : 'placeholder.webp'}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>UGX ${product.price.toLocaleString()}</p>
        `;
        listingsContainer.appendChild(productCard);
    });

    listingsTitle.textContent = category || type || "All Listings";

    // Track pagination for buttons
    firstVisibleDoc = snapshot.docs[0];
    lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
}

// Pagination buttons
prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        fetchListings(currentPage, currentFilters.category, currentFilters.type);
    }
});
nextBtn.addEventListener('click', () => {
    currentPage++;
    fetchListings(currentPage, currentFilters.category, currentFilters.type);
});

// Auto-load based on URL params (category/type)
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const type = params.get('type');
    fetchListings(1, category, type);
});