import { auth, db } from '../firebase.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    collection, addDoc, query, where, getDocs, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const showPostSectionBtn = document.getElementById('show-post-section-btn');
const postHostelSection = document.getElementById('post-hostel-section');
const hostelAuthContainer = document.getElementById('hostel-auth-container');
const hostelFormContainer = document.getElementById('hostel-form-container');
const userEmailDisplay = document.getElementById('user-email-display');
const hostelLogoutBtn = document.getElementById('hostel-logout-btn');

// Forms
const hostelLoginForm = document.getElementById('hostel-login-form');
const hostelSignupForm = document.getElementById('hostel-signup-form');
const hostelPostForm = document.getElementById('hostel-post-form');
const hostelFilterForm = document.getElementById('hostel-filter-form');

// Messages & Grid
const authMessage = document.getElementById('auth-message');
const formMessage = document.getElementById('form-message');
const hostelGrid = document.getElementById('hostel-grid');

// --- TABS ---
const tabs = document.querySelectorAll('.tab-link');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(item => item.classList.remove('active'));
        tab.classList.add('active');
        const tabContent = document.querySelectorAll('.tab-content');
        tabContent.forEach(content => content.classList.remove('active'));
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// --- HELPER FUNCTIONS ---
const showMessage = (element, message, isError = true) => {
    element.textContent = message;
    element.className = `message ${isError ? 'error' : 'success'}`;
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 4000);
};

// --- AUTHENTICATION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is logged in
        hostelAuthContainer.style.display = 'none';
        hostelFormContainer.style.display = 'block';
        userEmailDisplay.textContent = user.email;
    } else {
        // User is logged out
        hostelAuthContainer.style.display = 'block';
        hostelFormContainer.style.display = 'none';
    }
});

hostelLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, password)
        .catch(err => showMessage(authMessage, 'Failed to login. Please check email and password.'));
});

hostelSignupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    createUserWithEmailAndPassword(auth, email, password)
        .catch(err => showMessage(authMessage, 'Failed to create account. Email may already be in use.'));
});

hostelLogoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// --- FORM & PAGE LOGIC ---
showPostSectionBtn.addEventListener('click', () => {
    const isVisible = postHostelSection.style.display === 'block';
    postHostelSection.style.display = isVisible ? 'none' : 'block';
    showPostSectionBtn.textContent = isVisible ? 'Post Your Hostel' : 'Close Form';
});

hostelPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
        showMessage(formMessage, 'You must be logged in to post.', true);
        return;
    }

    // Collect form data
    const hostelName = document.getElementById('hostel-name').value;
    const location = document.getElementById('hostel-location').value;
    const price = document.getElementById('hostel-price').value;
    const duration = document.getElementById('price-duration').value;
    const whatsapp = document.getElementById('whatsapp-number').value;
    
    const amenities = [];
    document.querySelectorAll('.amenities-grid input[type="checkbox"]:checked').forEach(item => {
        amenities.push(item.value);
    });

    // TODO: Add image upload logic here
    
    try {
        await addDoc(collection(db, 'hostels'), {
            name: hostelName,
            name_lowercase: hostelName.toLowerCase(),
            location: location,
            location_lowercase: location.toLowerCase(),
            price: Number(price),
            priceDuration: duration,
            whatsapp: whatsapp,
            amenities: amenities,
            landlordId: user.uid,
            createdAt: serverTimestamp(),
            // imageUrls: [] // Add uploaded image URLs here
        });
        showMessage(formMessage, 'Hostel posted successfully!', false);
        hostelPostForm.reset();
        fetchHostels(); // Refresh the list
    } catch (error) {
        showMessage(formMessage, 'Error posting hostel. Please try again.', true);
        console.error("Error adding document: ", error);
    }
});

// --- FETCH & DISPLAY HOSTELS ---
async function fetchHostels(searchTerm = '') {
    hostelGrid.innerHTML = '<!-- Skeletons would go here -->'; // Clear grid
    
    let hostelsQuery = collection(db, 'hostels');
    if (searchTerm) {
        // This is a basic search. Firestore is limited. For better search, you'd use a third-party service.
        hostelsQuery = query(hostelsQuery, where('name_lowercase', '>=', searchTerm.toLowerCase()), where('name_lowercase', '<=', searchTerm.toLowerCase() + '\uf8ff'));
    }

    try {
        const querySnapshot = await getDocs(hostelsQuery);
        hostelGrid.innerHTML = ''; // Clear again after fetch
        if (querySnapshot.empty) {
            hostelGrid.innerHTML = '<p>No hostels found. Be the first to post one!</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const hostel = doc.data();
            renderHostelCard(hostel);
        });
    } catch (error) {
        console.error("Error fetching hostels:", error);
        hostelGrid.innerHTML = '<p>Could not load hostels at this time.</p>';
    }
}

function renderHostelCard(hostel) {
    const card = document.createElement('a');
    card.className = 'hostel-card';
    // card.href = `details.html?id=${hostel.id}`; // For a future details page

    // Placeholder image
    const image = hostel.imageUrls && hostel.imageUrls.length > 0 ? hostel.imageUrls[0] : 'https://via.placeholder.com/400x250.png?text=No+Image';

    card.innerHTML = `
        <img src="${image}" alt="${hostel.name}" class="hostel-card-image">
        <div class="hostel-card-content">
            <h3>${hostel.name}</h3>
            <p class="hostel-card-location"><i class="fa-solid fa-location-dot"></i> ${hostel.location}</p>
            <p class="hostel-card-price">UGX ${hostel.price.toLocaleString()} <span>/ ${hostel.priceDuration}</span></p>
        </div>
    `;
    hostelGrid.appendChild(card);
}

hostelFilterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const searchTerm = document.getElementById('filter-search-term').value;
    fetchHostels(searchTerm);
});


// --- INITIAL LOAD ---
fetchHostels();