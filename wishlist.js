import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, query, getDocs, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const wishlistGrid = document.getElementById('wishlist-grid');

/**
 * Fetches and displays the user's wishlist items.
 * @param {string} userId The UID of the currently logged-in user.
 */
async function fetchWishlist(userId) {
    const wishlistRef = collection(db, 'users', userId, 'wishlist');
    const q = query(wishlistRef, orderBy('addedAt', 'desc'));

    try {
        const querySnapshot = await getDocs(q);
        
        // Clear the initial loading message
        wishlistGrid.innerHTML = ''; 
        
        if (querySnapshot.empty) {
            wishlistGrid.innerHTML = `
                <div class="placeholder-message">
                    <h3>Your wishlist is empty</h3>
                    <p>Start browsing to add items you like!</p>
                    <a href="/">Browse Items</a>
                </div>`;
            return;
        }

        querySnapshot.forEach(docSnap => {
            const item = docSnap.data();
            const itemContainer = document.createElement('div');
            itemContainer.className = 'product-card-link'; 
            
            // This structure uses a card that contains the link and the button separately
            itemContainer.innerHTML = `
                <div class="product-card">
                    <a href="/product.html?id=${docSnap.id}">
                        <img src="${item.imageUrl || 'https://placehold.co/400/e0e0e0/777?text=No+Image'}" alt="${item.name}">
                    </a>
                    <a href="/product.html?id=${docSnap.id}" style="text-decoration: none; color: inherit;">
                        <h3>${item.name}</h3>
                        <p class="price">UGX ${item.price.toLocaleString()}</p>
                    </a>
                    <button class="remove-wishlist-btn" data-id="${docSnap.id}">Remove</button>
                </div>
            `;
            wishlistGrid.appendChild(itemContainer);
        });

    } catch (error) {
        console.error("Error fetching wishlist: ", error);
        wishlistGrid.innerHTML = '<div class="placeholder-message"><p>Could not load your wishlist. Please try again later.</p></div>';
    }
}

/**
 * Handles the removal of a wishlist item.
 * @param {Event} event The click event from the remove button.
 */
async function handleRemoveItem(event) {
    const button = event.target;
    const productId = button.dataset.id;
    const userId = auth.currentUser?.uid;

    if (!userId || !productId) return;

    // Optional: Add a confirmation dialog
    if (!confirm("Are you sure you want to remove this item?")) {
        return;
    }

    button.disabled = true;
    button.textContent = 'Removing...';

    try {
        await deleteDoc(doc(db, 'users', userId, 'wishlist', productId));
        
        // Remove the card from the UI instantly for a better experience
        button.closest('.product-card-link').remove();

        // If the grid is now empty, show the empty message
        if (wishlistGrid.children.length === 0) {
            wishlistGrid.innerHTML = `
                <div class="placeholder-message">
                    <h3>Your wishlist is empty</h3>
                    <p>Start browsing to add items you like!</p>
                    <a href="/">Browse Items</a>
                </div>`;
        }

    } catch (error) {
        console.error("Error removing item: ", error);
        alert("Failed to remove item. Please try again.");
        button.disabled = false;
        button.textContent = 'Remove';
    }
}


// --- Main Execution ---

// Use event delegation for remove buttons for better performance
wishlistGrid.addEventListener('click', (event) => {
    if (event.target.matches('.remove-wishlist-btn')) {
        handleRemoveItem(event);
    }
});

onAuthStateChanged(auth, user => {
    if (user) {
        fetchWishlist(user.uid);
    } else {
        wishlistGrid.innerHTML = `
            <div class="placeholder-message">
                <h2>Access Denied</h2>
                <p>Please <a href="/login/">log in</a> to view your wishlist.</p>
                <p>Redirecting you now...</p>
            </div>`;
        setTimeout(() => {
            window.location.href = '/login/';
        }, 2500);
    }
});