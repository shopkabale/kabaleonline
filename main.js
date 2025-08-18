import { db } from './firebase.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM Elements for the homepage ONLY
const productGrid = document.getElementById('product-grid');
const searchInput = document.getElementById('search-input');
let allProducts = [];

// --- Fetching and Displaying Products ---
async function fetchAndDisplayProducts() {
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        allProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts(allProducts);
    } catch (error) {
        console.error("Error fetching products: ", error);
        productGrid.innerHTML = '<p>Sorry, could not load products.</p>';
    }
}

// --- Rendering Products ---
function renderProducts(productsToDisplay) {
    productGrid.innerHTML = '';
    if (productsToDisplay.length === 0) {
        if (searchInput.value) {
            productGrid.innerHTML = '<p>No products match your search.</p>';
        } else {
            productGrid.innerHTML = '<p>No products found yet. Be the first to sell!</p>';
        }
        return;
    }
    productsToDisplay.forEach(product => {
        // Safeguard to handle both new and old image formats
        let primaryImage = '';
        if (product.imageUrls && product.imageUrls.length > 0) {
            primaryImage = product.imageUrls[0];
        } else if (product.imageUrl) {
            primaryImage = product.imageUrl; // Fallback for old products
        }

        const productLink = document.createElement('a');
        productLink.href = `product.html?id=${product.id}`;
        productLink.className = 'product-card-link';
        productLink.innerHTML = `
            <div class="product-card">
                <img src="${primaryImage}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p class="price">UGX ${product.price.toLocaleString()}</p>
            </div>
        `;
        productGrid.appendChild(productLink);
    });
}

// --- Search Logic ---
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredProducts = allProducts.filter(product =>
        (product.name && product.name.toLowerCase().includes(searchTerm)) ||
        (product.description && product.description.toLowerCase().includes(searchTerm))
    );
    renderProducts(filteredProducts);
}

searchInput.addEventListener('input', handleSearch);

// --- Initial Load ---
fetchAndDisplayProducts();
