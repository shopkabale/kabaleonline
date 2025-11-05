import { db } from '../firebase.js';
import { checkAdminAuth, setupHeader } from './admin-common.js';
import { collection, getDocs, doc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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
        setupEventListeners(); // Add this
    });
}

/**
 * Add event listener for delete button
 */
function setupEventListeners() {
    adminContent.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        
        if (button.dataset.action === 'delete-rental') {
            handleDeleteRental(button);
        }
    });
}


async function fetchAllRentals() {
    rentalList.innerHTML = '<li>Loading rentals...</li>';
    try {
        const q = query(collection(db, 'rentals'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            rentalList.innerHTML = '<li>No rentals found.</li>';
            return;
        }
        
        rentalList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const rental = docSnap.data();
            const id = docSnap.id;
            
            // --- UPDATED LOGIC (Matches your data structure) ---
            const title = rental.title || 'Unnamed Rental';
            const price = rental.price || 0;
            const priceFreq = rental.priceFrequency || 'N/A'; // e.g., "per Semester"
            const location = rental.location || 'N/A';
            const imageUrl = rental.imageUrls?.[0] || 'https://placehold.co/100';
            const contactName = rental.contactName || 'N/A';
            const contactPhone = rental.contactPhone || 'N/A';
            const description = rental.description || 'No description.';
            const listingType = rental.listingType || 'Listing'; // e.g., "Hostel"

            // Get amenities
            const amenities = rental.amenities || {};
            const amenitiesHTML = `
                <ul style="font-size: 0.85em; margin: 8px 0 0 0; padding-left: 20px; color: var(--text-secondary);">
                    <li><strong>Water:</strong> ${amenities.hasWater ? '✔️ Yes' : '❌ No'}</li>
                    <li><strong>Fenced:</strong> ${amenities.isFenced ? '✔️ Yes' : '❌ No'}</li>
                    <li><strong>Furnished:</strong> ${amenities.isFurnished ? '✔️ Yes' : '❌ No'}</li>
                    <li><strong>Power Backup:</strong> ${amenities.hasPowerBackup ? '✔️ Yes' : '❌ No'}</li>
                </ul>
            `;
            // --- END UPDATED LOGIC ---

            const li = document.createElement('li');
            li.className = 'user-list-item';
            li.style.alignItems = 'flex-start'; // Align content to the top
            
            // New, more detailed card layout
            li.innerHTML = `
                <img src="${imageUrl}" alt="${title}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px; margin-right: 15px;">
                <div style="flex-grow: 1;">
                    <p style="font-weight: bold; font-size: 1.2em; margin: 0 0 5px 0;">
                        ${title} 
                        <span style="font-size: 0.7em; font-weight: normal; background-color: var(--border-color); color: var(--text-secondary); padding: 2px 6px; border-radius: 4px; margin-left: 5px;">${listingType}</span>
                    </p>
                    <p style="margin: 0; font-weight:bold; color:green;">UGX ${price.toLocaleString()} (${priceFreq})</p>
                    <p style="margin: 5px 0; color: var(--text-secondary);"><i class="fa-solid fa-location-dot" style="margin-right: 5px;"></i> ${location}</p>
                    <p style="margin: 5px 0; color: var(--text-secondary);"><i class="fa-solid fa-user" style="margin-right: 5px;"></i> ${contactName} (<i class="fa-solid fa-phone" style="margin-right: 5px;"></i> ${contactPhone})</p>
                    <p style="margin: 5px 0; font-size: 0.9em;">${description}</p>
                    <p style="margin: 5px 0; font-weight: bold; font-size: 0.9em;">Amenities:</p>
                    ${amenitiesHTML}
                </div>
                <button class="action-btn red" 
                        data-action="delete-rental" 
                        data-id="${id}" 
                        data-name="${title.replace(/"/g, '&quot;')}">
                    Delete
                </button>
            `;
            
            rentalList.appendChild(li);
        });
    } catch (e) { 
        console.error("Error fetching rentals:", e); 
        rentalList.innerHTML = '<li>Could not load rentals.</li>'; 
    }
}

/**
 * New function to handle deleting a rental
 */
async function handleDeleteRental(button) {
    const id = button.dataset.id;
    const name = button.dataset.name;
    
    if (!confirm(`Are you sure you want to delete the rental "${name}"?`)) return;
    
    button.disabled = true;
    button.textContent = 'Deleting...';
    
    try {
        await deleteDoc(doc(db, 'rentals', id));
        await fetchAllRentals(); // Refresh the list
    } catch (e) {
        console.error("Error deleting rental:", e);
        alert("Failed to delete the rental.");
        button.disabled = false;
        button.textContent = 'Delete';
    }
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeRentalManagement);