function getCloudinaryTransformedUrl(url, type) {
    if (!url || !url.includes('res.cloudinary.com')) { return url || 'https://placehold.co/400x400/e0e0e0/777?text=No+Image'; }
    const transformations = { thumbnail: 'c_fill,g_auto,w_250,h_250,f_auto,q_auto', full: 'c_limit,w_800,h_800,f_auto,q_auto', grid_item: 'c_scale,w_400,f_auto,q_auto' };
    const transformString = transformations[type] || transformations.thumbnail;
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) { return url; }
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}


import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const container = document.getElementById('rental-details-container');
const placeholderCard = document.getElementById('rental-card-placeholder');
const rentalImage = document.getElementById('rental-image');
const rentalTitle = document.getElementById('rental-title');
const rentalLocation = document.getElementById('rental-location'); // New element
const rentalPrice = document.getElementById('rental-price');
const rentalDescription = document.getElementById('rental-description');
const amenitiesList = document.getElementById('amenities-list');
const contactName = document.getElementById('contact-name');
const contactPhone = document.getElementById('contact-phone');
const ownerActionsContainer = document.getElementById('owner-actions');
const deleteBtn = document.getElementById('delete-btn');
const mapContainer = document.querySelector('.map-container');

const urlParams = new URLSearchParams(window.location.search);
const rentalId = urlParams.get('id');

function initMap(latitude, longitude) {
    if (!latitude || !longitude) {
        mapContainer.style.display = 'none';
        return;
    }
    
    mapContainer.style.display = 'block';

    const map = L.map('map').setView([latitude, longitude], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.marker([latitude, longitude]).addTo(map);
}

async function fetchAndDisplayRental() {
    if (!rentalId) {
        container.innerHTML = '<p>Error: No rental ID provided.</p>';
        return;
    }

    try {
        const rentalRef = doc(db, 'rentals', rentalId);
        const rentalSnap = await getDoc(rentalRef);

        if (!rentalSnap.exists()) {
            container.innerHTML = '<p>Sorry, this rental listing could not be found.</p>';
            return;
        }

        const rentalData = rentalSnap.data();

        const originalImage = (rentalData.imageUrls && rentalData.imageUrls.length > 0) ? rentalData.imageUrls[0] : '../placeholder.webp';
        rentalImage.src = getCloudinaryTransformedUrl(originalImage, 'full');
        
        rentalTitle.textContent = rentalData.title;
        rentalLocation.textContent = rentalData.location; // Set text location
        rentalPrice.textContent = `UGX ${rentalData.price.toLocaleString()} / ${rentalData.priceFrequency.replace('per ', '')}`;
        rentalDescription.textContent = rentalData.description;
        contactName.textContent = rentalData.contactName;
        contactPhone.textContent = rentalData.contactPhone;

        amenitiesList.innerHTML = '';
        let hasAmenities = false;
        for (const [key, value] of Object.entries(rentalData.amenities)) {
            if (value === true) {
                hasAmenities = true;
                const amenityName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                const li = document.createElement('li');
                li.innerHTML = `<i class="fas fa-check"></i> ${amenityName}`;
                amenitiesList.appendChild(li);
            }
        }
        if (!hasAmenities) {
            amenitiesList.innerHTML = '<li>No specific amenities listed.</li>';
        }

        onAuthStateChanged(auth, (user) => {
            if (user && user.uid === rentalData.posterId) {
                ownerActionsContainer.style.display = 'block';
            }
        });
        
        initMap(rentalData.latitude, rentalData.longitude);

        container.innerHTML = '';
        container.appendChild(placeholderCard);
        placeholderCard.style.visibility = 'visible';

    } catch (error) {
        console.error("Error fetching rental:", error);
        container.innerHTML = '<p>There was an error loading this listing.</p>';
    }
}

deleteBtn.addEventListener('click', async () => {
    if (confirm("Are you sure you want to permanently delete this listing?")) {
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Deleting...';
        try {
            await deleteDoc(doc(db, 'rentals', rentalId));
            alert("Listing deleted successfully.");
            window.location.href = '/rentals/';
        } catch (error) {
            console.error("Error deleting document: ", error);
            alert("Could not delete listing. Please try again.");
            deleteBtn.disabled = false;
            deleteBtn.textContent = 'Delete Listing';
        }
    }
});

fetchAndDisplayRental();
