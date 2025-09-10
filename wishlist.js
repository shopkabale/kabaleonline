import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, query, getDocs, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const wishlistGrid = document.getElementById('wishlist-grid');
let currentUserId = null;

onAuthStateChanged(auth, user => {
    if (user) {
        currentUserId = user.uid;
        fetchWishlist(user.uid);
    } else {
        wishlistGrid.innerHTML = '<h2>Access Denied</h2><p>Please <a href="/sell/">log in</a> to view your wishlist.</p>';
    }
});

async function fetchWishlist(uid) {
    const wishlistRef = collection(db, `users/${uid}/wishlist`);
    const q = query(wishlistRef, orderBy('addedAt', 'desc'));

    try {
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            wishlistGrid.innerHTML = '<p>Your wishlist is empty. Start browsing to add items!</p>';
            return;
        }

        wishlistGrid.innerHTML = ''; // Clear loading message
        querySnapshot.forEach(docSnap => {
            const item = docSnap.data();
            const itemDiv = document.createElement('div');
            itemDiv.className = 'product-card-link'; // Use this class for styling container
            itemDiv.innerHTML = `
                <div class="product-card">
                    <a href="/product.html?id=${item.productId}">
                        <img src="${item.imageUrl || 'https://placehold.co/400/e0e0e0/777?text=No+Image'}" alt="${item.name}">
                        <h3>${item.name}</h3>
                        <p class="price">UGX ${item.price.toLocaleString()}</p>
                    </a>
                    <button class="remove-wishlist-btn" data-id="${docSnap.id}">Remove</button>
                </div>
            `;
            wishlistGrid.appendChild(itemDiv);
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-wishlist-btn').forEach(button => {
            button.addEventListener('click', handleRemoveItem);
        });

    } catch (error) {
        console.error("Error fetching wishlist: ", error);
        wishlistGrid.innerHTML = '<p>Could not load your wishlist. Please try again later.</p>';
    }
}

async function handleRemoveItem(event) {
    const productId = event.target.dataset.id;
    if (!currentUserId || !productId) return;
    
    if (confirm("Are you sure you want to remove this item from your wishlist?")) {
        try {
            await deleteDoc(doc(db, `users/${currentUserId}/wishlist`, productId));
            // Refresh the list to show the change
            fetchWishlist(currentUserId);
        } catch (error) {
            console.error("Error removing item: ", error);
            alert("Failed to remove item. Please try again.");
        }
    }
}

// Add some basic styling for the remove button
const style = document.createElement('style');
style.textContent = `
    .remove-wishlist-btn {
        background-color: #d9534f;
        color: white;
        border: none;
        padding: 8px;
        margin: 0 15px 15px 15px;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
    }
    .remove-wishlist-btn:hover {
        background-color: #c9302c;
    }
`;
document.head.appendChild(style);
