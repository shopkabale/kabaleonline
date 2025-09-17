// In main.js - The new and improved function to fetch and filter products

import { db } from './firebase.js';
import { collection, query, where, getDocs, limit, orderBy, startAfter } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const productGrid = document.getElementById('product-grid');
const loadMoreBtn = document.getElementById('load-more-btn');
const listingsTitle = document.getElementById('listings-title');
let lastVisible; // Keeps track of the last document for pagination

async function fetchProducts(loadMore = false) {
    if (!productGrid) return; // Stop if the product grid isn't on the page

    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading...';

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        const type = urlParams.get('type');

        let productsQuery;
        const baseCollection = collection(db, 'products');
        
        // --- THIS IS THE NEW FILTERING LOGIC ---
        if (category) {
            listingsTitle.textContent = `Items in "${category}"`;
            productsQuery = query(baseCollection, where('category', '==', category), orderBy('createdAt', 'desc'), limit(12));
        } else if (type) {
            listingsTitle.textContent = `Available Services`;
            productsQuery = query(baseCollection, where('listing_type', '==', type), orderBy('createdAt', 'desc'), limit(12));
        } else {
            // Default query for the homepage if no filters are applied
            listingsTitle.textContent = 'Recent Items';
            productsQuery = query(baseCollection, orderBy('createdAt', 'desc'), limit(12));
        }
        
        // Handle pagination for the "Load More" button
        if (loadMore && lastVisible) {
            productsQuery = query(productsQuery, startAfter(lastVisible));
        }
        // --- END OF NEW LOGIC ---

        const documentSnapshots = await getDocs(productsQuery);

        if (!loadMore) {
            productGrid.innerHTML = ''; // Clear grid only on the first load
        }
        
        if (documentSnapshots.empty && !loadMore) {
             productGrid.innerHTML = '<p style="text-align: center; width: 100%;">No items found for this filter.</p>';
             loadMoreBtn.style.display = 'none';
             return;
        }

        documentSnapshots.forEach(doc => {
            const product = doc.data();
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            
            // This is your product card structure. You can customize it as needed.
            const imageUrl = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : 'placeholder.webp';
            productCard.innerHTML = `
                <a href="/product.html?id=${doc.id}" class="product-card-link">
                    <img src="${imageUrl}" alt="${product.name}" loading="lazy">
                    <div class="product-card-info">
                        <h3>${product.name}</h3>
                        <p class="price">UGX ${product.price.toLocaleString()}</p>
                    </div>
                </a>
            `;
            productGrid.appendChild(productCard);
        });

        // Update the last visible document for the next "Load More" click
        lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];
        
        // Show or hide the "Load More" button
        if (documentSnapshots.docs.length < 12) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
        }

    } catch (error) {
        console.error("Error fetching products:", error);
        productGrid.innerHTML = '<p>Could not load items. Please try again later.</p>';
    } finally {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load More';
    }
}

// Initial load when the page is ready
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    
    if(loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => fetchProducts(true));
    }
});
