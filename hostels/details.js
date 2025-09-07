import { db } from '../firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const detailsContainer = document.getElementById('hostel-details-container');

// --- MAIN FUNCTION ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get Hostel ID from URL
    const params = new URLSearchParams(window.location.search);
    const hostelId = params.get('id');

    if (!hostelId) {
        showError();
        return;
    }

    try {
        // 2. Fetch Hostel Data
        const hostelRef = doc(db, 'hostels', hostelId);
        const hostelSnap = await getDoc(hostelRef);

        if (!hostelSnap.exists()) {
            showError();
            return;
        }
        
        const hostelData = hostelSnap.data();

        // 3. Fetch Landlord Data (using landlordId from hostel data)
        let landlordData = { name: 'A Kabale Online User', whatsapp: '' }; // Default values
        if (hostelData.landlordId) {
            const landlordRef = doc(db, 'users', hostelData.landlordId);
            const landlordSnap = await getDoc(landlordRef);
            if (landlordSnap.exists()) {
                landlordData = landlordSnap.data();
            }
        }

        // 4. Populate the Page with Data
        populatePage(hostelData, landlordData);
        showContent();

    } catch (err) {
        console.error("Error fetching hostel details:", err);
        showError();
    }
});


function populatePage(hostel, landlord) {
    // Set basic info
    document.getElementById('hostel-name').textContent = hostel.name;
    document.getElementById('hostel-location').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${hostel.location}`;
    document.getElementById('hostel-description').textContent = hostel.description;
    document.getElementById('landlord-name').textContent = landlord.name || 'A Kabale Online User';

    // Set price
    const priceEl = document.getElementById('hostel-price');
    priceEl.innerHTML = `UGX ${hostel.price.toLocaleString()} <span>/ ${hostel.term}</span>`;
    
    // Set main image
    const mainImage = document.getElementById('main-hostel-image');
    if (hostel.imageUrls && hostel.imageUrls.length > 0) {
        mainImage.src = hostel.imageUrls[0];
    } else {
        mainImage.src = "https://via.placeholder.com/800x500.png?text=No+Image+Available";
    }

    // Populate amenities
    const amenitiesList = document.getElementById('amenities-list');
    amenitiesList.innerHTML = ''; // Clear any placeholders
    for (const key in hostel.amenities) {
        if (hostel.amenities[key] === true) {
            const li = document.createElement('li');
            // Capitalize the first letter of the amenity name
            const amenityName = key.charAt(0).toUpperCase() + key.slice(1);
            li.innerHTML = `<i class="fa-solid fa-check"></i> ${amenityName}`;
            amenitiesList.appendChild(li);
        }
    }

    // Set up WhatsApp contact button
    const contactBtn = document.getElementById('contact-landlord-btn');
    if (landlord.whatsapp) {
        // Assumes whatsapp number is stored correctly
        const whatsappNumber = landlord.whatsapp.startsWith('256') ? landlord.whatsapp : `256${landlord.whatsapp.substring(1)}`;
        contactBtn.href = `https://wa.me/${whatsappNumber}`;
    } else {
        contactBtn.style.display = 'none'; // Hide button if no number
    }
}


// --- UI STATE FUNCTIONS ---
function showError() {
    loadingState.style.display = 'none';
    detailsContainer.style.display = 'none';
    errorState.style.display = 'block';
}

function showContent() {
    loadingState.style.display = 'none';
    errorState.style.display = 'none';
    detailsContainer.style.display = 'block';
}