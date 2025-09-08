import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const container = document.getElementById('rental-details-container');
const placeholderCard = document.getElementById('rental-card-placeholder');
const rentalImage = document.getElementById('rental-image');
const rentalTitle = document.getElementById('rental-title');
const rentalPrice = document.getElementById('rental-price');
const rentalDescription = document.getElementById('rental-description');
const amenitiesList = document.getElementById('amenities-list');
const contactName = document.getElementById('contact-name');
const contactPhone = document.getElementById('contact-phone');
const ownerActionsContainer = document.getElementById('owner-actions');
const deleteBtn = document.getElementById('delete-btn');

const urlParams = new URLSearchParams(window.location.search);
const rentalId = urlParams.get('id');

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

        const primaryImage = (rentalData.imageUrls && rentalData.imageUrls.length > 0) ? rentalData.imageUrls[0] : '../placeholder.webp';
        rentalImage.src = primaryImage;
        rentalTitle.textContent = rentalData.title;
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
