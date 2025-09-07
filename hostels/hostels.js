import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    collection, addDoc, query, getDocs, serverTimestamp, orderBy, where, doc, getDoc, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const hostelPostForm = document.getElementById('hostel-post-form');
const publicHostelGrid = document.getElementById('hostel-grid-public');
const myHostelsGrid = document.getElementById('my-hostels-grid');
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const sellerEmailSpan = document.getElementById('seller-email');
const showFormBtn = document.getElementById('show-hostel-form-btn');
const formContainer = document.getElementById('hostel-form-container');
const formMessage = document.getElementById('hostel-form-message');

let currentEditingHostelId = null; // Variable to track if we are editing or creating

// --- AUTH STATE & DATA FETCHING ---
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        if (authContainer) authContainer.style.display = 'none';
        if (dashboardContainer) dashboardContainer.style.display = 'block';
        if (sellerEmailSpan) sellerEmailSpan.textContent = user.email;
        fetchMyHostels(user.uid); // Fetch user's own hostels when they log in
    } else {
        if (authContainer) authContainer.style.display = 'block';
        if (dashboardContainer) dashboardContainer.style.display = 'none';
    }
});

// --- EVENT LISTENERS ---
if (showFormBtn) {
    showFormBtn.addEventListener('click', () => {
        const isVisible = formContainer.style.display === 'block';
        formContainer.style.display = isVisible ? 'none' : 'block';
        showFormBtn.textContent = isVisible ? 'Post New Hostel/Rental' : 'Close Form';
        if (isVisible) {
            resetHostelForm(); // Clear form when hiding
        }
    });
}

if (hostelPostForm) {
    hostelPostForm.addEventListener('submit', handleHostelSubmit);
}

// --- HELPER FUNCTIONS ---
const showMessage = (message, isError = true) => {
    if (!formMessage) return;
    formMessage.textContent = message;
    formMessage.className = isError ? 'error-message' : 'success-message';
    formMessage.style.display = 'block';
    setTimeout(() => { formMessage.style.display = 'none'; }, 5000);
};

async function uploadImageToCloudinary(file) {
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

// --- CORE LOGIC: SUBMIT, FETCH, EDIT, DELETE ---

async function handleHostelSubmit(e) {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return showMessage("You must be logged in to post.");
    
    const submitBtn = hostelPostForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
        const name = document.getElementById('hostel-name').value;
        const location = document.getElementById('hostel-location').value;
        const price = document.getElementById('hostel-price').value;
        const term = document.getElementById('hostel-term').value;
        const description = document.getElementById('hostel-description').value;
        const imageFile1 = document.getElementById('hostel-image-1').files[0];
        const imageFile2 = document.getElementById('hostel-image-2').files[0];
        const amenities = { gate: document.getElementById('amenity-gate').checked, fence: document.getElementById('amenity-fence').checked, electricity: document.getElementById('amenity-electricity').checked, tiles: document.getElementById('amenity-tiles').checked, cement: document.getElementById('amenity-cement').checked, cameras: document.getElementById('amenity-cameras').checked };
        
        let imageUrls = [];
        if (currentEditingHostelId) {
            const docSnap = await getDoc(doc(db, 'hostels', currentEditingHostelId));
            if (docSnap.exists()) imageUrls = docSnap.data().imageUrls || [];
        }

        if (imageFile1) imageUrls[0] = await uploadImageToCloudinary(imageFile1);
        if (imageFile2) imageUrls[1] = await uploadImageToCloudinary(imageFile2);
        
        const hostelData = { name, location, description, amenities, imageUrls, price: Number(price), term, landlordId: user.uid, landlordEmail: user.email, updatedAt: serverTimestamp() };

        if (currentEditingHostelId) {
            await updateDoc(doc(db, 'hostels', currentEditingHostelId), hostelData);
            showMessage("Hostel updated successfully!", false);
        } else {
            hostelData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'hostels'), hostelData);
            showMessage("Hostel posted successfully!", false);
        }
        
        resetHostelForm();
        fetchMyHostels(user.uid);
        fetchPublicHostels();

    } catch (error) {
        console.error("Error submitting hostel: ", error);
        showMessage(`Error: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = currentEditingHostelId ? "Update Listing" : "Submit Listing";
    }
}

async function fetchPublicHostels() {
    if (!publicHostelGrid) return;
    publicHostelGrid.innerHTML = '<p>Loading available hostels...</p>';
    const q = query(collection(db, 'hostels'), orderBy('createdAt', 'desc'));
    
    try {
        const querySnapshot = await getDocs(q);
        publicHostelGrid.innerHTML = '';
        if (querySnapshot.empty) {
            publicHostelGrid.innerHTML = '<p>No hostels have been posted yet. Check back soon!</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const hostel = doc.data();
            const card = document.createElement('a');
            card.className = 'hostel-card';
            card.href = `details.html?id=${doc.id}`;
            const amenitiesHTML = Object.keys(hostel.amenities || {}).filter(key => hostel.amenities[key]).map(key => `<span><i class="fa-solid fa-check"></i> ${key.charAt(0).toUpperCase() + key.slice(1)}</span>`).join('');
            card.innerHTML = `
                <img src="${hostel.imageUrls && hostel.imageUrls.length > 0 ? hostel.imageUrls[0] : 'https://via.placeholder.com/400x250.png?text=No+Image'}" alt="${hostel.name}" class="hostel-card-image">
                <div class="hostel-card-content">
                    <h3>${hostel.name}</h3>
                    <p class="hostel-card-location"><i class="fa-solid fa-location-dot"></i> ${hostel.location}</p>
                    <p class="hostel-card-price">UGX ${hostel.price.toLocaleString()} <span>/ ${hostel.term}</span></p>
                    <div class="hostel-card-amenities">${amenitiesHTML}</div>
                </div>
            `;
            publicHostelGrid.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching public hostels: ", error);
        publicHostelGrid.innerHTML = '<p>Could not load hostels. Please try again later.</p>';
    }
}

async function fetchMyHostels(uid) {
    if (!myHostelsGrid || !uid) return;
    myHostelsGrid.innerHTML = '<p>Loading your listings...</p>';
    
    const q = query(collection(db, 'hostels'), where("landlordId", "==", uid), orderBy('createdAt', 'desc'));
    
    try {
        const querySnapshot = await getDocs(q);
        myHostelsGrid.innerHTML = '';
        if (querySnapshot.empty) {
            myHostelsGrid.innerHTML = '<p>You have not posted any hostels yet.</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const hostel = doc.data();
            const card = document.createElement('div');
            card.className = 'hostel-card';
            const amenitiesHTML = Object.keys(hostel.amenities || {}).filter(key => hostel.amenities[key]).map(key => `<span><i class="fa-solid fa-check"></i> ${key.charAt(0).toUpperCase() + key.slice(1)}</span>`).join('');
            card.innerHTML = `
                <img src="${hostel.imageUrls && hostel.imageUrls.length > 0 ? hostel.imageUrls[0] : 'https://via.placeholder.com/400x250.png?text=No+Image'}" alt="${hostel.name}" class="hostel-card-image">
                <div class="hostel-card-content">
                    <h3>${hostel.name}</h3>
                    <p class="hostel-card-location">${hostel.location}</p>
                </div>
                <div class="hostel-card-controls">
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                </div>
            `;
            card.querySelector('.edit-btn').addEventListener('click', () => populateFormForEdit(doc.id, hostel));
            card.querySelector('.delete-btn').addEventListener('click', () => deleteHostel(doc.id));
            myHostelsGrid.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching my hostels: ", error);
        myHostelsGrid.innerHTML = '<p>Could not load your listings.</p>';
    }
}

function populateFormForEdit(id, hostel) {
    formContainer.style.display = 'block';
    showFormBtn.textContent = 'Close Form';
    window.scrollTo({ top: formContainer.offsetTop - 80, behavior: 'smooth' });

    currentEditingHostelId = id;
    document.getElementById('hostel-name').value = hostel.name || '';
    document.getElementById('hostel-location').value = hostel.location || '';
    document.getElementById('hostel-price').value = hostel.price || '';
    document.getElementById('hostel-term').value = hostel.term || 'Semester';
    document.getElementById('hostel-description').value = hostel.description || '';
    for (const key in hostel.amenities) {
        const checkbox = document.getElementById(`amenity-${key}`);
        if (checkbox) checkbox.checked = hostel.amenities[key];
    }
    
    hostelPostForm.querySelector('button[type="submit"]').textContent = "Update Listing";
}

async function deleteHostel(id) {
    if (!confirm("Are you sure you want to delete this hostel listing? This cannot be undone.")) return;
    
    try {
        await deleteDoc(doc(db, "hostels", id));
        showMessage("Hostel deleted successfully.", false);
        fetchMyHostels(auth.currentUser.uid);
        fetchPublicHostels();
    } catch (error) {
        console.error("Error deleting hostel: ", error);
        showMessage("Could not delete hostel. Please try again.");
    }
}

function resetHostelForm() {
    currentEditingHostelId = null;
    if(hostelPostForm) hostelPostForm.reset();
    if(formContainer) formContainer.style.display = 'none';
    if(showFormBtn) showFormBtn.textContent = "Post New Hostel/Rental";
    if(hostelPostForm) hostelPostForm.querySelector('button[type="submit"]').textContent = "Submit Listing";
}

// --- INITIAL LOAD ---
fetchPublicHostels();