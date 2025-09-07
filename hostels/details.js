import { db } from '../firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const detailsContainer = document.getElementById('hostel-details-container');

// --- MAIN FUNCTION ---
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const hostelId = params.get('id');

    if (!hostelId) {
        showError();
        return;
    }

    try {
        const hostelRef = doc(db, 'hostels', hostelId);
        const hostelSnap = await getDoc(hostelRef);

        if (!hostelSnap.exists()) {
            showError();
            return;
        }
        
        const hostelData = hostelSnap.data();

        let landlordData = { name: 'A Kabale Online User', whatsapp: '' }; // Default values
        if (hostelData.landlordId) {
            const landlordRef = doc(db, 'users', hostelData.landlordId);
            const landlordSnap = await getDoc(landlordRef);
            if (landlordSnap.exists()) {
                landlordData = landlordSnap.data();
            }
        }

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
    amenitiesList.innerHTML = '';
    if (hostel.amenities) {
        for (const key in hostel.amenities) {
            if (hostel.amenities[key] === true) {
                const li = document.createElement('li');
                const amenityName = key.charAt(0).toUpperCase() + key.slice(1);
                li.innerHTML = `<i class="fa-solid fa-check"></i> ${amenityName}`;
                amenitiesList.appendChild(li);
            }
        }
    }
    
    // Set up contact buttons and phone link
    const contactBtn = document.getElementById('contact-landlord-btn');
    const phoneLink = document.getElementById('landlord-phone-link');
    const landlordInfoBox = document.getElementById('landlord-info');

    if (landlord.whatsapp) {
        // Format number for international calling links (e.g., +256...)
        const fullNumber = landlord.whatsapp.startsWith('256') ? landlord.whatsapp : `256${landlord.whatsapp.substring(1)}`;
        
        // Set up WhatsApp button
        contactBtn.href = `https://wa.me/${fullNumber}`;
        
        // Set up the visible, clickable phone number
        phoneLink.href = `tel:+${fullNumber}`;
        // Display as a local number (e.g., 07...)
        phoneLink.textContent = `0${fullNumber.substring(3)}`;

    } else {
        // If no number is available, hide both the WhatsApp button and the entire landlord info box
        contactBtn.style.display = 'none';
        landlordInfoBox.style.display = 'none';
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