import { db, auth } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const productGrid = document.getElementById('product-grid');
const headerActionBtn = document.getElementById('header-action-btn');
const searchInput = document.getElementById('search-input');
let allProducts = [];

// --- Authentication Check for Header Button ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            headerActionBtn.textContent = 'Admin Panel';
            headerActionBtn.href = '/admin/';
        } else {
            headerActionBtn.textContent = 'My Dashboard';
            headerActionBtn.href = '/sell/';
        }
    } else {
        headerActionBtn.textContent = 'Sell an Item';
        headerActionBtn.href = '/sell/';
    }
});

// --- Fetching and Displaying Products ---
async function fetchAndDisplayProducts() {
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        allProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        renderProducts(allProducts);
    } catch (error) {
        console.error("Error fetching products: ", error);
        productGrid.innerHTML = '<p>Sorry, could not load products at this time. Please check your connection.</p>';
    }
}

// --- Rendering Products ---
function renderProducts(productsToDisplay) {
    productGrid.innerHTML = '';
    if (productsToDisplay.length === 0) {
        productGrid.innerHTML = '<p>No products found.</p>';
        return;
    }
    productsToDisplay.forEach(product => {
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

// --- Search Logic ---
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredProducts = allProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
    );
    renderProducts(filteredProducts);
}

searchInput.addEventListener('input', handleSearch);

// Initial Load
fetchAndDisplayProducts();
