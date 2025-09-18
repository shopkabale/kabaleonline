// ==== CLOUDINARY TRANSFORM HELPER (keep as-is) ====
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
    if (urlParts.length !== 2) return url;
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}

// ==== AUTH, DASHBOARD, SELLER DASHBOARD, QA ETC. KEEP AS-IS ====
// ... all existing main.js code for auth, seller products, QA, Cloudinary, product forms ...

// ==== HOMEPAGE LISTING CODE (NEW ADDITIONS ONLY) ====
import { db } from '../firebase.js';
import { collection, query, getDocs, orderBy, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM ELEMENTS
const homepageProductsContainer = document.getElementById('homepage-products');
const homepageCategorySelect = document.getElementById('homepage-category');
const paginationContainer = document.getElementById('pagination-container');

const itemCategories = { "Electronics": "Electronics", "Clothing & Apparel": "Clothing & Apparel", "Home & Furniture": "Home & Furniture", "Health & Beauty": "Health & Beauty", "Vehicles": "Vehicles", "Property": "Property", "Other": "Other" };
const serviceCategories = { "Tutoring & Academics": "Tutoring & Academics", "Printing & Design": "Printing & Design", "Tech & Repair": "Tech & Repair", "Personal & Beauty": "Personal & Beauty", "Events & Creative": "Events & Creative", "Other Services": "Other Services" };

let homepageProducts = []; // full fetched products
let currentPage = 1;
const pageSize = 12;

// Populate homepage category filter
function populateHomepageCategories() {
    if (!homepageCategorySelect) return;
    homepageCategorySelect.innerHTML = '<option value="all" selected>All Categories</option>';
    const allCategories = { ...itemCategories, ...serviceCategories };
    Object.keys(allCategories).forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = allCategories[cat];
        homepageCategorySelect.appendChild(option);
    });
}
populateHomepageCategories();

// Fetch all products for homepage
async function fetchHomepageProducts() {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    homepageProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    currentPage = 1;
    renderHomepageProducts();
}

// Render homepage products with pagination & category filter
function renderHomepageProducts() {
    if (!homepageProductsContainer) return;
    const selectedCategory = homepageCategorySelect.value || 'all';
    const filtered = homepageProducts.filter(p => selectedCategory === 'all' || p.category === selectedCategory);

    const totalPages = Math.ceil(filtered.length / pageSize);
    if (currentPage > totalPages) currentPage = 1;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filtered.slice(start, end);

    homepageProductsContainer.innerHTML = '';
    if (pageItems.length === 0) {
        homepageProductsContainer.innerHTML = '<p>No products found in this category.</p>';
        paginationContainer.innerHTML = '';
        return;
    }

    pageItems.forEach(product => {
        const thumbnailUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'thumbnail');
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${thumbnailUrl}" alt="${product.name}" loading="lazy">
            <h3>${product.name}</h3>
            <p class="price">UGX ${product.price.toLocaleString()}</p>
            <a class="cta-button" href="/product.html?id=${product.id}">View Details</a>
        `;
        homepageProductsContainer.appendChild(productCard);
    });

    renderPagination(totalPages);
}

// Render pagination buttons
function renderPagination(totalPages) {
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';
    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === currentPage ? 'active' : '';
        btn.addEventListener('click', () => {
            currentPage = i;
            renderHomepageProducts();
            window.scrollTo(0, 0);
        });
        paginationContainer.appendChild(btn);
    }
}

// Category change listener
if (homepageCategorySelect) {
    homepageCategorySelect.addEventListener('change', () => {
        currentPage = 1;
        renderHomepageProducts();
    });
}

// Initialize homepage
document.addEventListener('DOMContentLoaded', fetchHomepageProducts);