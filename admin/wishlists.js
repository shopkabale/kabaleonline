import { db } from '../firebase.js';
import { checkAdminAuth, setupHeader } from './admin-common.js';
import { collection, getDocs, query } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const adminContent = document.getElementById('admin-content');
const loader = document.getElementById('loader');
const totalWishlistItems = document.getElementById('total-wishlist-items');
const userWishlistSummary = document.getElementById('user-wishlist-summary');

/**
 * Main initialization function.
 */
function initializeWishlist() {
    checkAdminAuth((adminData) => {
        setupHeader(adminData.name); 
        adminContent.style.display = 'block';
        loader.style.display = 'none';

        fetchWishlistData();
    });
}

/**
 * Fetches all wishlisted items from all users.
 */
async function fetchWishlistData() {
    userWishlistSummary.innerHTML = '<li>Loading all wishlist items...</li>';
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        if (usersSnapshot.empty) {
            userWishlistSummary.innerHTML = '<li>No users found.</li>';
            return;
        }
        
        let totalItems = 0;
        let allWishlistItemsHTML = []; // An array to hold all HTML strings

        // Loop through each user
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userName = userData.name || userData.email || 'Unknown User';
            
            // Get the 'wishlist' subcollection for this user
            const wishlistCol = collection(db, 'users', userDoc.id, 'wishlist');
            const wishlistSnapshot = await getDocs(wishlistCol); // Get actual items

            if (!wishlistSnapshot.empty) {
                totalItems += wishlistSnapshot.size;

                // Add a header for this user's items
                allWishlistItemsHTML.push(`
                    <li class="user-list-item" style="background-color: var(--bg-card); justify-content: center; margin-top: 20px;">
                        <strong>Items wishlisted by ${userName}</strong>
                    </li>
                `);

                // Loop over each item in their wishlist
                wishlistSnapshot.forEach(itemDoc => {
                    const item = itemDoc.data();
                    
                    // --- THIS IS THE FIX, using your confirmed data structure ---
                    const itemName = item.name || 'Untitled Item';
                    const itemPrice = item.price || 0;
                    // Use 'imageUrl' (string) NOT 'imageUrls' (array)
                    const itemImage = item.imageUrl || 'https://placehold.co/100'; 
                    // 'sellerName' is not in your data, so we remove it.
                    // --- END FIX ---
                    
                    // Create the HTML for this specific item
                    const itemHTML = `
                        <li class="user-list-item" style="align-items: center;">
                            <img src="${itemImage}" alt="${itemName}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; margin-right: 15px;">
                            <div style="flex-grow: 1;">
                                <p style="font-weight: bold; margin: 0 0 5px 0;">${itemName}</p>
                                </div>
                            <span style="font-weight: bold; color: green; font-size: 1.1em;">UGX ${itemPrice.toLocaleString()}</span>
                        </li>
                    `;
                    allWishlistItemsHTML.push(itemHTML);
                });
            }
        }
        
        // Render everything at once
        totalWishlistItems.textContent = totalItems;
        if (allWishlistItemsHTML.length === 0) {
            userWishlistSummary.innerHTML = '<li>No items have been wishlisted by any user.</li>';
        } else {
            userWishlistSummary.innerHTML = allWishlistItemsHTML.join('');
        }
        
    } catch (e) { 
        console.error("Error fetching wishlist data:", e); 
        userWishlistSummary.innerHTML = '<li>Could not load wishlist data. Check the console (F12) for errors.</li>'; 
    }
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeWishlist);