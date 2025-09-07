import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, addDoc, query, getDocs, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const hostelPostForm = document.getElementById('hostel-post-form');
const hostelGrid = document.getElementById('hostel-grid');
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const sellerEmailSpan = document.getElementById('seller-email');

// This listener shows/hides sections based on login state
// The actual login logic is handled by sell.js
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

// --- HOSTEL SUBMISSION ---
if (hostelPostForm) {
    hostelPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) {
            alert('You must be logged in to post.');
            return;
        }
        
        const hostelName = document.getElementById('hostel-name').value;
        const location = document.getElementById('hostel-location').value;

        try {
            await addDoc(collection(db, 'hostels'), {
                name: hostelName,
                location: location,
                landlordId: user.uid,
                createdAt: serverTimestamp(),
            });
            alert('Hostel posted successfully!');
            hostelPostForm.reset();
            fetchHostels(); // Refresh list
        } catch (error) {
            alert('Error posting hostel.');
            console.error("Error adding document: ", error);
        }
    });
}

// --- FETCH & DISPLAY HOSTELS ---
async function fetchHostels() {
    if (!hostelGrid) return;
    hostelGrid.innerHTML = '<p>Loading hostels...</p>';
    
    try {
        const querySnapshot = await getDocs(query(collection(db, 'hostels'), orderBy('createdAt', 'desc')));
        hostelGrid.innerHTML = ''; // Clear after fetch
        if (querySnapshot.empty) {
            hostelGrid.innerHTML = '<p>No hostels found yet. Be the first to post!</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const hostel = doc.data();
            const card = document.createElement('div');
            card.className = 'hostel-card';
            card.innerHTML = `
                <img src="https://via.placeholder.com/400x250.png?text=Hostel" alt="${hostel.name}" class="hostel-card-image">
                <div class="hostel-card-content">
                    <h3>${hostel.name}</h3>
                    <p class="hostel-card-location"><i class="fa-solid fa-location-dot"></i> ${hostel.location}</p>
                    <p class="hostel-card-price">Contact for Price</p>
                </div>
            `;
            hostelGrid.appendChild(card);
        });
    } catch (error) {
        console.error(error);
        hostelGrid.innerHTML = '<p>Could not load hostels.</p>';
    }
}

// Initial load
if (hostelGrid) {
    fetchHostels();
}