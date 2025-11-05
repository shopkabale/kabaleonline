import { db } from '../firebase.js';
import { checkAdminAuth, setupHeader } from './admin-common.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const adminContent = document.getElementById('admin-content');
const loader = document.getElementById('loader');
const rentalList = document.getElementById('rental-list');

/**
 * Main initialization function.
 */
function initializeRentalManagement() {
    checkAdminAuth((adminData) => {
        setupHeader(adminData.name); 
        adminContent.style.display = 'block';
        loader.style.display = 'none';

        fetchAllRentals();
    });
}

async function fetchAllRentals() {
    rentalList.innerHTML = '<li>Loading rentals...</li>';
    try {
        // Assuming you have a 'rentals' collection
        const q = query(collection(db, 'rentals'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            rentalList.innerHTML = '<li>No rentals found.</li>';
            return;
        }
        
        rentalList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const rental = docSnap.data();
            
            const li = document.createElement('li');
            li.className = 'user-list-item';
            // Customize this with your rental data structure
            li.innerHTML = `
                <div>
                    <p><strong>${rental.name || 'Unnamed Rental'}</strong></p>
                    <p>Price: UGX ${(rental.price || 0).toLocaleString()}</p>
                    <p>Location: ${rental.location || 'N/A'}</p>
                </div>
            `;
            rentalList.appendChild(li);
        });
    } catch (e) { 
        console.error("Error fetching rentals:", e); 
        rentalList.innerHTML = '<li>Could not load rentals.</li>'; 
    }
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeRentalManagement);