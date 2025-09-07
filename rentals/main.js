import { db } from '../firebase.js';
import { collection, query, orderBy, getDocs, where, limit } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const rentalGrid = document.getElementById('rental-grid');
const filterType = document.getElementById('filter-type');
const filterLocation = document.getElementById('filter-location');
const filterSort = document.getElementById('filter-sort');

async function fetchRentals() {
    rentalGrid.innerHTML = '<p>Loading listings...</p>';
    try {
        let q = collection(db, 'rentals');
        const constraints = [];

        // Type Filter
        const type = filterType.value;
        if (type) {
            constraints.push(where('listingType', '==', type));
        }

        // Location Filter (simple text search, case-insensitive)
        const location = filterLocation.value.trim();
        // Firestore doesn't support case-insensitive text search directly,
        // so this will be a basic filter for now.

        // Sorting
        const sortBy = filterSort.value;
        if (sortBy === 'newest') {
            constraints.push(orderBy('createdAt', 'desc'));
        } else if (sortBy === 'price-asc') {
            constraints.push(orderBy('price', 'asc'));
        } else if (sortBy === 'price-desc') {
            constraints.push(orderBy('price', 'desc'));
        }

        q = query(q, ...constraints, limit(30));
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            rentalGrid.innerHTML = '<p>No listings match your criteria.</p>';
            return;
        }

        rentalGrid.innerHTML = '';
        let results = [];
        querySnapshot.forEach(doc => {
            results.push({ id: doc.id, ...doc.data() });
        });
        
        // Apply location filter in JavaScript for case-insensitivity
        if (location) {
            results = results.filter(rental => 
                rental.location.toLowerCase().includes(location.toLowerCase())
            );
        }

        if(results.length === 0){
            rentalGrid.innerHTML = '<p>No listings match your criteria.</p>';
            return;
        }

        results.forEach(rental => {
            const card = document.createElement('a');
            card.className = 'rental-card';
            card.href = `detail.html?id=${rental.id}`; // Will build this page next
            
            const primaryImage = (rental.imageUrls && rental.imageUrls.length > 0) ? rental.imageUrls[0] : '../placeholder.webp';

            card.innerHTML = `
                <img src="${primaryImage}" alt="${rental.title}">
                <div class="rental-card-content">
                    <div class="rental-card-title">${rental.title}</div>
                    <div class="rental-card-price">UGX ${rental.price.toLocaleString()} / ${rental.priceFrequency}</div>
                    <div class="rental-card-location">📍 ${rental.location}</div>
                </div>
            `;
            rentalGrid.appendChild(card);
        });

    } catch (error) {
        console.error("Error fetching rentals:", error);
        rentalGrid.innerHTML = '<p>Could not load listings. A database index might be missing.</p>';
    }
}

// Re-fetch when any filter changes
filterType.addEventListener('change', fetchRentals);
filterLocation.addEventListener('input', fetchRentals);
filterSort.addEventListener('change', fetchRentals);

// Initial fetch
fetchRentals();
