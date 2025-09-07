import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, addDoc, query, getDocs, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const hostelPostForm = document.getElementById('hostel-post-form');
const hostelGrid = document.getElementById('hostel-grid');
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const sellerEmailSpan = document.getElementById('seller-email');
const formMessage = document.getElementById('hostel-form-message');

// --- AUTH STATE LOGIC ---
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        if (authContainer) authContainer.style.display = 'none';
        if (dashboardContainer) dashboardContainer.style.display = 'block';
        if (sellerEmailSpan) sellerEmailSpan.textContent = user.email;
    } else {
        if (authContainer) authContainer.style.display = 'block';
        if (dashboardContainer) dashboardContainer.style.display = 'none';
    }
});

// --- HELPER FUNCTION FOR MESSAGES ---
const showMessage = (message, isError = true) => {
    if (!formMessage) return;
    formMessage.textContent = message;
    formMessage.className = isError ? 'error-message' : 'success-message';
    formMessage.style.display = 'block';
    setTimeout(() => { formMessage.style.display = 'none'; }, 5000);
};

// --- IMAGE UPLOAD FUNCTION (Cloned from sell.js for this page) ---
async function uploadImageToCloudinary(file) {
    // This function needs your Netlify function endpoint to work
    const response = await fetch('/.netlify/functions/generate-signature');
    if (!response.ok) throw new Error('Could not get upload signature.');
    const { signature, timestamp, cloudname, apikey } = await response.json();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apikey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudname}/image/upload`;
    const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: formData });
    if (!uploadResponse.ok) throw new Error('Cloudinary upload failed.');
    const uploadData = await uploadResponse.json();
    return uploadData.secure_url;
}

// --- HOSTEL SUBMISSION (Now handles the full form) ---
if (hostelPostForm) {
    hostelPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return showMessage("You must be logged in to post.");
        
        const submitBtn = hostelPostForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";

        try {
            // Get all values from the new form
            const name = document.getElementById('hostel-name').value;
            const location = document.getElementById('hostel-location').value;
            const price = document.getElementById('hostel-price').value;
            const term = document.getElementById('hostel-term').value;
            const description = document.getElementById('hostel-description').value;
            const imageFile1 = document.getElementById('hostel-image-1').files[0];
            const imageFile2 = document.getElementById('hostel-image-2').files[0];

            // Get amenities
            const amenities = {
                gate: document.getElementById('amenity-gate').checked,
                fence: document.getElementById('amenity-fence').checked,
                electricity: document.getElementById('amenity-electricity').checked,
                tiles: document.getElementById('amenity-tiles').checked,
                cement: document.getElementById('amenity-cement').checked,
                cameras: document.getElementById('amenity-cameras').checked,
            };

            // Upload images
            let imageUrls = [];
            if (imageFile1) imageUrls.push(await uploadImageToCloudinary(imageFile1));
            if (imageFile2) imageUrls.push(await uploadImageToCloudinary(imageFile2));
            
            // Create data object
            const hostelData = {
                name, location, description, amenities, imageUrls,
                price: Number(price),
                term,
                landlordId: user.uid,
                landlordEmail: user.email,
                createdAt: serverTimestamp(),
            };

            // Add to Firestore
            await addDoc(collection(db, 'hostels'), hostelData);
            
            showMessage("Hostel posted successfully!", false);
            hostelPostForm.reset();
            fetchHostels();

        } catch (error) {
            // THIS FIXES THE BUG by providing a detailed error message
            console.error("Error posting hostel: ", error);
            showMessage(`Error: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Listing";
        }
    });
}

// --- FETCH & DISPLAY HOSTELS (Now displays new info) ---
async function fetchHostels() {
    if (!hostelGrid) return;
    hostelGrid.innerHTML = '<p>Loading hostels...</p>';
    
    try {
        const querySnapshot = await getDocs(query(collection(db, 'hostels'), orderBy('createdAt', 'desc')));
        hostelGrid.innerHTML = '';
        if (querySnapshot.empty) {
            hostelGrid.innerHTML = '<p>No hostels found yet. Be the first to post!</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const hostel = doc.data();
            const card = document.createElement('a'); // Make the card a link
            card.className = 'hostel-card';
            card.href = `details.html?id=${doc.id}`; // Link to a future details page

            // Helper to generate amenity icons
            const amenitiesHTML = Object.keys(hostel.amenities || {})
                .filter(key => hostel.amenities[key]) // Only show if true
                .map(key => `<span><i class="fa-solid fa-check"></i> ${key.charAt(0).toUpperCase() + key.slice(1)}</span>`)
                .join('');

            card.innerHTML = `
                <img src="${hostel.imageUrls && hostel.imageUrls.length > 0 ? hostel.imageUrls[0] : 'https://via.placeholder.com/400x250.png?text=No+Image'}" alt="${hostel.name}" class="hostel-card-image">
                <div class="hostel-card-content">
                    <h3>${hostel.name}</h3>
                    <p class="hostel-card-location"><i class="fa-solid fa-location-dot"></i> ${hostel.location}</p>
                    <p class="hostel-card-price">UGX ${hostel.price.toLocaleString()} <span>/ ${hostel.term}</span></p>
                    <div class="hostel-card-amenities">${amenitiesHTML}</div>
                </div>
            `;
            hostelGrid.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching hostels: ", error);
        hostelGrid.innerHTML = '<p>Could not load hostels at the moment. Please try again later.</p>';
    }
}

// Initial load
fetchHostels();