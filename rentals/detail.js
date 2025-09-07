import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const rentalDetailsContainer = document.getElementById('rental-details');
const urlParams = new URLSearchParams(window.location.search);
const rentalId = urlParams.get('id');

async function fetchRentalDetails(id) {
    if (!id) {
        rentalDetailsContainer.innerHTML = '<p>No rental ID specified.</p>';
        return;
    }

    try {
        const docRef = doc(db, 'rentals', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const rental = docSnap.data();
            displayRental(rental);
            checkUserAuthorization(rental.posterId, id);
        } else {
            rentalDetailsContainer.innerHTML = '<p>Rental listing not found.</p>';
        }
    } catch (error) {
        console.error("Error fetching rental details:", error);
        rentalDetailsContainer.innerHTML = '<p>Error loading rental details. Please try again.</p>';
    }
}

function displayRental(rental) {
    const amenities = Object.entries(rental.amenities)
        .filter(([key, value]) => value)
        .map(([key, value]) => `<li><i class="fa-solid fa-check"></i> ${key.replace('has', '').replace('is', '').replace(/([A-Z])/g, ' $1').trim()}</li>`)
        .join('');

    const primaryImage = (rental.imageUrls && rental.imageUrls.length > 0) ? rental.imageUrls[0] : '../placeholder.webp';

    rentalDetailsContainer.innerHTML = `
        <div class="rental-details-card">
            <img src="${primaryImage}" alt="${rental.title}">
            <h1>${rental.title}</h1>
            <p><strong>Price:</strong> UGX ${rental.price.toLocaleString()} / ${rental.priceFrequency.replace('per ', '')}</p>
            <p><strong>Location:</strong> ${rental.location}</p>
            <h3>Description</h3>
            <p>${rental.description}</p>
            <h3>Amenities</h3>
            <ul class="amenities-list">
                ${amenities || '<p>No specific amenities listed.</p>'}
            </ul>
            <div class="contact-info">
                <h3>Contact Details</h3>
                <p><strong>Contact Person:</strong> ${rental.contactName}</p>
                <p><strong>Phone:</strong> ${rental.contactPhone}</p>
            </div>
            <div id="owner-actions" class="action-buttons" style="display:none;">
                <button id="delete-btn" class="delete-btn">Delete Listing</button>
            </div>
        </div>
    `;
}

function checkUserAuthorization(posterId, rentalId) {
    onAuthStateChanged(auth, (user) => {
        if (user && user.uid === posterId) {
            const ownerActionsDiv = document.getElementById('owner-actions');
            ownerActionsDiv.style.display = 'flex';
            const deleteBtn = document.getElementById('delete-btn');
            deleteBtn.addEventListener('click', () => handleDeleteListing(rentalId));
        }
    });
}

async function handleDeleteListing(id) {
    if (window.confirm("Are you sure you want to delete this listing? This action cannot be undone.")) {
        try {
            const docRef = doc(db, 'rentals', id);
            await deleteDoc(docRef);
            alert("Listing deleted successfully!");
            window.location.href = '/rentals/';
        } catch (error) {
            console.error("Error deleting document:", error);
            alert("An error occurred while deleting the listing. Please try again.");
        }
    }
}

// Kick off the process
fetchRentalDetails(rentalId);

