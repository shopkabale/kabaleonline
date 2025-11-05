import { db } from '../firebase.js';
import { checkAdminAuth, setupHeader } from './admin-common.js';
import { collection, getDocs, getCountFromServer } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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

async function fetchWishlistData() {
    // Note: This matches your dashboard logic, but can be slow if you have many users.
    userWishlistSummary.innerHTML = '<li>Loading user data...</li>';
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        if (usersSnapshot.empty) {
            userWishlistSummary.innerHTML = '<li>No users found.</li>';
            return;
        }
        
        let totalWishlistedItems = 0;
        userWishlistSummary.innerHTML = '';
        
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const wishlistCol = collection(db, 'users', userDoc.id, 'wishlist');
            const wishlistSnapshot = await getCountFromServer(wishlistCol);
            const count = wishlistSnapshot.data().count;
            
            totalWishlistedItems += count;
            
            if (count > 0) {
                const li = document.createElement('li');
                li.className = 'user-list-item';
                li.innerHTML = `
                    <span>${userData.email || userDoc.id}</span>
                    <span style="font-weight:bold;">${count} items</span>
                `;
                userWishlistSummary.appendChild(li);
            }
        }
        
        if (userWishlistSummary.innerHTML === '') {
            userWishlistSummary.innerHTML = '<li>No users have wishlisted items.</li>';
        }

        totalWishlistItems.textContent = totalWishlistedItems;
        
    } catch (e) { 
        console.error("Error fetching wishlist data:", e); 
        userWishlistSummary.innerHTML = '<li>Could not load wishlist data.</li>'; 
    }
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeWishlist);