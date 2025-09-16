function getCloudinaryTransformedUrl(url, type) {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || 'https://placehold.co/400x400/e0e0e0/777?text=No+Image';
    }
    const transformations = {
        thumbnail: 'c_fill,g_auto,w_250,h_250,f_auto,q_auto',
        full: 'c_limit,w_800,h_800,f_auto,q_auto',
        grid_item: 'c_scale,w_400,f_auto,q_auto'
    };
    const transformString = transformations[type] || transformations.thumbnail;
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) {
        return url;
    }
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}


import { db } from '../firebase.js';
import { collection, query, orderBy, getDocs, where, limit } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const rentalGrid = document.getElementById('rental-grid');
const filterType = document.getElementById('filter-type');
const filterLocation = document.getElementById('filter-location');
const filterSort = document.getElementById('filter-sort');
const applyFiltersBtn = document.getElementById('apply-rental-filters');

async function fetchRentals() {
    if (rentalGrid) {
        rentalGrid.innerHTML = '<p>Loading listings...</p>';
    } else {
        console.error("Fatal Error: rental-grid element not found.");
        return;
    }

    try {
        let q = collection(db, 'rentals');
        const constraints = [];

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
            constraints.push(orderBy('createdAt', 'desc'));
        }

        q = query(q, ...constraints, limit(30));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            rentalGrid.innerHTML = '<p>No listings match your criteria.</p>';
            return;
        }

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

        rentalGrid.innerHTML = '';
        results.forEach(rental => {
            const card = document.createElement('a');
            card.className = 'rental-card';
            card.href = `detail.html?id=${rental.id}`;

            const originalImage = (rental.imageUrls && rental.imageUrls.length > 0) ? rental.imageUrls[0] : '../placeholder.webp';
            const optimizedImage = getCloudinaryTransformedUrl(originalImage, 'grid_item');

            card.innerHTML = `
                <img src="${optimizedImage}" alt="${rental.title}" loading="lazy">
                <div class="rental-card-content">
                    <div class="rental-card-title">${rental.title}</div>
                    <div class="rental-card-price">UGX ${rental.price.toLocaleString()} / ${rental.priceFrequency.replace('per ', '')}</div>
                    <div class="rental-card-location">📍 ${rental.location}</div>
                </div>
            `;
            rentalGrid.appendChild(card);
        });

    } catch (error) {
        console.error("Error fetching rentals:", error);
        rentalGrid.innerHTML = '<p>Could not load listings. A database index might be missing. Please check the console for errors.</p>';
    }
}

if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', fetchRentals);
}
if (filterSort) {
    filterSort.addEventListener('change', fetchRentals);
}

document.addEventListener('DOMContentLoaded', fetchRentals);
