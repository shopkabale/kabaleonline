import { auth, db } from '../firebase.js';
import {
    createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendEmailVerification
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    collection, addDoc, query, getDocs, serverTimestamp, orderBy, where, doc, getDoc, updateDoc, deleteDoc, setDoc
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- ELEMENT SELECTION ---
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const sellerEmailSpan = document.getElementById('seller-email');
const logoutBtn = document.getElementById('logout-btn');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginErrorElement = document.getElementById('login-error');
const signupErrorElement = document.getElementById('signup-error');
const hostelPostForm = document.getElementById('hostel-post-form');
const publicHostelGrid = document.getElementById('hostel-grid-public');
const myHostelsGrid = document.getElementById('my-hostels-grid');
const showFormBtn = document.getElementById('show-hostel-form-btn');
const formContainer = document.getElementById('hostel-form-container');
const formMessage = document.getElementById('hostel-form-message');

let currentEditingHostelId = null;

// --- HELPER FUNCTIONS ---
const showMessage = (element, message, isError = true) => { /* ... full function from previous step ... */ };
const toggleLoading = (button, isLoading, originalText) => { /* ... full function from previous step ... */ };
function normalizeWhatsAppNumber(phone) { /* ... full function from previous step ... */ }
async function uploadImageToCloudinary(file) { /* ... full function from previous step ... */ }

// --- AUTHENTICATION ---
onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        authContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
        sellerEmailSpan.textContent = user.email;
        fetchMyHostels(user.uid);
    } else {
        authContainer.style.display = 'block';
        dashboardContainer.style.display = 'none';
    }
});
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const loginButton = loginForm.querySelector('button[type="submit"]');
        toggleLoading(loginButton, true, 'Logging In');
        signInWithEmailAndPassword(auth, email, password)
            .catch(error => { showMessage(loginErrorElement, 'Invalid email or password.'); })
            .finally(() => { toggleLoading(loginButton, false, 'Login'); });
    });
}
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const whatsapp = document.getElementById('signup-whatsapp').value;
        const password = document.getElementById('signup-password').value;
        const signupButton = signupForm.querySelector('button[type="submit"]');
        toggleLoading(signupButton, true, 'Creating Account');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, "users", user.uid), {
                name, email, whatsapp: normalizeWhatsAppNumber(whatsapp),
                role: 'seller', createdAt: serverTimestamp()
            });
            await sendEmailVerification(user);
            alert("Success! Please check your email to verify your account.");
        } catch (error) {
            let msg = 'An error occurred.';
            if (error.code === 'auth/email-already-in-use') msg = 'This email is already registered.';
            showMessage(signupErrorElement, msg);
        } finally { toggleLoading(signupButton, false, 'Create Account'); }
    });
}
if (logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));
const tabs = document.querySelectorAll('.tab-link');
if (tabs.length) {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.remove('active');
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });
}

// --- HOSTEL LOGIC ---
if (showFormBtn) {
    showFormBtn.addEventListener('click', () => {
        formContainer.style.display = formContainer.style.display === 'block' ? 'none' : 'block';
        if (formContainer.style.display === 'none') resetHostelForm();
    });
}
if (hostelPostForm) hostelPostForm.addEventListener('submit', handleHostelSubmit);

async function handleHostelSubmit(e) {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    const submitBtn = hostelPostForm.querySelector('button[type="submit"]');
    toggleLoading(submitBtn, true, 'Submitting...');
    try {
        const name = document.getElementById('hostel-name').value;
        const location = document.getElementById('hostel-location').value;
        const price = document.getElementById('hostel-price').value;
        const term = document.getElementById('hostel-term').value;
        const phone = document.getElementById('hostel-phone').value; // Get the new phone number
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
        
        const hostelData = { name, location, description, amenities, imageUrls, price: Number(price), term, phone: normalizeWhatsAppNumber(phone), landlordId: user.uid, updatedAt: serverTimestamp() };
        
        if (currentEditingHostelId) {
            await updateDoc(doc(db, 'hostels', currentEditingHostelId), hostelData);
            showMessage(formMessage, "Hostel updated successfully!", false);
        } else {
            hostelData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'hostels'), hostelData);
            showMessage(formMessage, "Hostel posted successfully!", false);
        }
        resetHostelForm();
        fetchMyHostels(user.uid);
        fetchPublicHostels();
    } catch (error) {
        showMessage(formMessage, `Error: ${error.message}`);
    } finally {
        toggleLoading(submitBtn, false, currentEditingHostelId ? "Update Listing" : "Submit Listing");
    }
}

async function fetchPublicHostels() {
    if (!publicHostelGrid) return;
    publicHostelGrid.innerHTML = '<p>Loading available hostels...</p>';
    const q = query(collection(db, 'hostels'), orderBy('createdAt', 'desc'));
    try {
        const querySnapshot = await getDocs(q);
        publicHostelGrid.innerHTML = '';
        if (querySnapshot.empty) { publicHostelGrid.innerHTML = '<p>No hostels posted yet.</p>'; return; }
        querySnapshot.forEach((doc) => {
            const hostel = doc.data();
            const card = document.createElement('div'); // CHANGED to a DIV
            card.className = 'hostel-card';
            // card.href is REMOVED
            const amenitiesHTML = Object.keys(hostel.amenities || {}).filter(key => hostel.amenities[key]).map(key => `<span><i class="fa-solid fa-check"></i> ${key.charAt(0).toUpperCase() + key.slice(1)}</span>`).join('');
            
            const localPhone = hostel.phone ? `0${hostel.phone.substring(3)}` : 'Not provided';
            const telLink = hostel.phone ? `tel:+${hostel.phone}` : '#';

            card.innerHTML = `
                <img src="${hostel.imageUrls && hostel.imageUrls.length > 0 ? hostel.imageUrls[0] : 'https://via.placeholder.com/400x250.png?text=No+Image'}" alt="${hostel.name}" class="hostel-card-image">
                <div class="hostel-card-content">
                    <h3>${hostel.name}</h3>
                    <p>${hostel.description}</p>
                    <p><i class="fa-solid fa-location-dot"></i> ${hostel.location}</p>
                    <p><strong>UGX ${hostel.price.toLocaleString()}</strong> / ${hostel.term}</p>
                    <div>${amenitiesHTML}</div>
                </div>
                <div class="hostel-card-footer">
                    <a href="${telLink}" class="contact-link"><i class="fa-solid fa-phone"></i> Call: ${localPhone}</a>
                </div>
            `;
            publicHostelGrid.appendChild(card);
        });
    } catch (error) {
        publicHostelGrid.innerHTML = '<p>Could not load hostels.</p>';
    }
}

async function fetchMyHostels(uid) {
    if (!myHostelsGrid || !uid) return;
    myHostelsGrid.innerHTML = '<p>Loading your listings...</p>';
    const q = query(collection(db, 'hostels'), where("landlordId", "==", uid), orderBy('createdAt', 'desc'));
    try {
        const querySnapshot = await getDocs(q);
        myHostelsGrid.innerHTML = '';
        if (querySnapshot.empty) { myHostelsGrid.innerHTML = '<p>You have not posted any hostels yet.</p>'; return; }
        querySnapshot.forEach((doc) => {
            const hostel = doc.data();
            const card = document.createElement('div');
            card.className = 'hostel-card';
            card.innerHTML = `
                <img src="${hostel.imageUrls && hostel.imageUrls.length > 0 ? hostel.imageUrls[0] : 'https://via.placeholder.com/400x250.png?text=No+Image'}" alt="${hostel.name}" class="hostel-card-image">
                <div class="hostel-card-content"><h3>${hostel.name}</h3></div>
                <div class="hostel-card-controls">
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                </div>`;
            card.querySelector('.edit-btn').addEventListener('click', () => populateFormForEdit(doc.id, hostel));
            card.querySelector('.delete-btn').addEventListener('click', () => deleteHostel(doc.id));
            myHostelsGrid.appendChild(card);
        });
    } catch (error) {
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
    document.getElementById('hostel-phone').value = hostel.phone ? `0${hostel.phone.substring(3)}` : '';
    document.getElementById('hostel-description').value = hostel.description || '';
    if (hostel.amenities) {
        for (const key in hostel.amenities) {
            const checkbox = document.getElementById(`amenity-${key}`);
            if (checkbox) checkbox.checked = hostel.amenities[key];
        }
    }
    hostelPostForm.querySelector('button[type="submit"]').textContent = "Update Listing";
}

async function deleteHostel(id) {
    if (!confirm("Are you sure?")) return;
    try {
        await deleteDoc(doc(db, "hostels", id));
        showMessage(formMessage, "Hostel deleted.", false);
        fetchMyHostels(auth.currentUser.uid);
        fetchPublicHostels();
    } catch (error) {
        showMessage(formMessage, "Could not delete hostel.");
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