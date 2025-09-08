import { db } from '../firebase.js';
import { collection, query, orderBy, getDocs, where, limit } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const rentalGrid = document.getElementById('rental-grid');
const filterType = document.getElementById('filter-type');
const filterLocation = document.getElementById('filter-location');
const filterSort = document.getElementById('filter-sort');
const applyFiltersBtn = document.getElementById('apply-rental-filters');

async function fetchRentals() {
    // Show a loading message immediately
    if (rentalGrid) {
        rentalGrid.innerHTML = '<p>Loading listings...</p>';
    } else {
        console.error("Fatal Error: rental-grid element not found.");
        return; // Stop if the main container is missing
    }

    try {
        let q = collection(db, 'rentals');
        const constraints = [];

        // 1. Build database query based on filters
        if (filterType && filterType.value) {
            constraints.push(where('listingType', '==', filterType.value));
        }

        const sortBy = filterSort ? filterSort.value : 'newest';
        if (sortBy === 'newest') {
            constraints.push(orderBy('createdAt', 'desc'));
        } else if (sortBy === 'price-asc') {
            constraints.push(orderBy('price', 'asc'));
        } else if (sortBy === 'price-desc') {
            constraints.push(orderBy('price', 'desc'));
        } else {
            // Default sort if nothing is selected
            constraints.push(orderBy('createdAt', 'desc'));
        }

        // Apply all constraints to the query
        q = query(q, ...constraints, limit(30));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            rentalGrid.innerHTML = '<p>No listings match your criteria.</p>';
            return;
        }

        // 2. Process results and apply client-side text filter for location
        let results = [];
        querySnapshot.forEach(doc => {
            results.push({ id: doc.id, ...doc.data() });
        });

        if (filterLocation && filterLocation.value.trim() !== '') {
            const location = filterLocation.value.trim().toLowerCase();
            results = results.filter(rental => 
                rental.location.toLowerCase().includes(location)
            );
        }

        if (results.length === 0) {
            rentalGrid.innerHTML = '<p>No listings found in that location.</p>';
            return;
        }

        // 3. Display the final results
        rentalGrid.innerHTML = '';
        results.forEach(rental => {
            const card = document.createElement('a');
            card.className = 'rental-card';
            card.href = `detail.html?id=${rental.id}`;

            const primaryImage = (rental.imageUrls && rental.imageUrls.length > 0) ? rental.imageUrls[0] : '../placeholder.webp';

            card.innerHTML = `
                <img src="${primaryImage}" alt="${rental.title}">
                <div class="rental-card-content">
                    <div class="rental-card-title">${rental.title}</div>
                    <div class="rental-card-price">UGX ${rental.price.toLocaleString()} / ${rental.priceFrequency.replace('per ', '')}</div>
                    <div class="rental-card-location">📍 ${rental.location}</div>
                </div>
            `;
            rentalGrid.appendChild(card);
        });

    } catch (error) {
        // This block runs if Firestore fails (e.g., missing index)
        console.error("Error fetching rentals:", error);
        rentalGrid.innerHTML = '<p>Could not load listings. A database index might be missing. Please check the console for errors.</p>';
    }
}

// --- Event Listeners ---
// Check if filter elements exist before adding listeners
if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', fetchRentals);
}
if (filterSort) {
    filterSort.addEventListener('change', fetchRentals);
}

// Initial fetch when the page first loads
document.addEventListener('DOMContentLoaded', fetchRentals);
