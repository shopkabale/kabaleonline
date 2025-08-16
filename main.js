import { db, auth } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM Elements
const productGrid = document.getElementById('product-grid');
const sellerNavLink = document.getElementById('seller-nav-link');
const searchInput = document.getElementById('search-input');
const sortFilter = document.getElementById('sort-filter');

// This array will hold all products fetched from Firestore
let allProducts = [];

// --- Authentication Check ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            sellerNavLink.textContent = 'Admin Panel';
            sellerNavLink.href = '/admin/';
        } else {
            sellerNavLink.textContent = 'My Dashboard';
            sellerNavLink.href = '/sell/';
        }
    } else {
        sellerNavLink.textContent = 'Sell on Kabale Online';
        sellerNavLink.href = '/sell/';
    }
});

// --- Fetching and Displaying Products ---

// Main function to fetch products from Firestore ONCE
async function fetchAllProducts() {
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            productGrid.innerHTML = '<p>No products found. Check back later!</p>';
            return;
        }

        // Store each product's data and its ID in our global array
        allProducts = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Display the products for the first time
        renderProducts(allProducts);

    } catch (error) {
        console.error("Error fetching products: ", error);
        productGrid.innerHTML = '<p>Sorry, we could not load the products at this time.</p>';
    }
}

// Function to render an array of products to the screen
function renderProducts(productsToDisplay) {
    productGrid.innerHTML = ''; // Clear the grid first

    if (productsToDisplay.length === 0) {
        productGrid.innerHTML = '<p>No products match your search.</p>';
        return;
    }

    productsToDisplay.forEach((product) => {
        const productLink = document.createElement('a');
        productLink.href = `product.html?id=${product.id}`;
        productLink.className = 'product-card-link';

        productLink.innerHTML = `
            <div class="product-card">
                <img src="${product.imageUrl}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p class="price">UGX ${product.price.toLocaleString()}</p>
            </div>
        `;
        productGrid.appendChild(productLink);
    });
}

// --- Search and Filter Logic ---

// This function runs every time the user searches or sorts
function applyFiltersAndSearch() {
    let filteredProducts = [...allProducts]; // Start with a fresh copy of all products

    // Apply search filter
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        );
    }

    // Apply sort filter
    const sortValue = sortFilter.value;
    if (sortValue === 'price-asc') {
        filteredProducts.sort((a, b) => a.price - b.price); // Sort by price, low to high
    } else if (sortValue === 'price-desc') {
        filteredProducts.sort((a, b) => b.price - a.price); // Sort by price, high to low
    }
    
    // Re-render the product grid with the filtered and sorted products
    renderProducts(filteredProducts);
}

// --- Event Listeners ---
searchInput.addEventListener('input', applyFiltersAndSearch);
sortFilter.addEventListener('change', applyFiltersAndSearch);

// Initial call to load all products when the page opens
fetchAllProducts();
