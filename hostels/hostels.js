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
const initialView = document.getElementById('initial-view');
const showAuthBtn = document.getElementById('show-auth-btn');
const publicListingsTitle = document.getElementById('public-listings-title');
const logoutBtn = document.getElementById('logout-btn');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginErrorElement = document.getElementById('login-error');
const signupErrorElement = document.getElementById('signup-error');
const hostelPostForm = document.getElementById('hostel-post-form');
const publicHostelGrid = document.getElementById('hostel-grid-public');

// --- HELPER FUNCTIONS ---
const toggleLoading = (button, isLoading, originalText) => {
    if(!button) return;
    if (isLoading) {
        button.disabled = true; button.classList.add('loading');
        button.innerHTML = `<span class="loader"></span> ${originalText}`;
    } else {
        button.disabled = false; button.classList.remove('loading');
        button.innerHTML = originalText;
    }
};
function normalizeWhatsAppNumber(phone) {
    if(!phone) return '';
    let cleaned = ('' + phone).replace(/\D/g, '');
    if (cleaned.startsWith('0')) return '256' + cleaned.substring(1);
    return cleaned;
}

// --- AUTHENTICATION ---
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        authContainer.style.display = 'none';
        initialView.style.display = 'none';
        dashboardContainer.style.display = 'block';
    } else {
        authContainer.style.display = 'none';
        initialView.style.display = 'block';
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
            .catch(error => { /* show error */ })
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
            await setDoc(doc(db, "users", userCredential.user.uid), {
                name, email, whatsapp: normalizeWhatsAppNumber(whatsapp)
            });
            await sendEmailVerification(userCredential.user);
            alert("Success! Check your email to verify your account.");
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            toggleLoading(signupButton, false, 'Create Account');
        }
    });
}
if (logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));

// --- UI LOGIC ---
if (showAuthBtn) {
    showAuthBtn.addEventListener('click', () => {
        initialView.style.display = 'none';
        authContainer.style.display = 'block';
    });
}
const tabs = document.querySelectorAll('.tab-link');
if (tabs.length) {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            authContainer.dataset.activeTab = tabName === 'login-tab' ? 'login' : 'signup';
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });
}

// --- HOSTEL LOGIC ---
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
        const phone = document.getElementById('hostel-phone').value;
        const description = document.getElementById('hostel-description').value;
        const amenities = { gate: document.getElementById('amenity-gate').checked, fence: document.getElementById('amenity-fence').checked, electricity: document.getElementById('amenity-electricity').checked, tiles: document.getElementById('amenity-tiles').checked, cement: document.getElementById('amenity-cement').checked, cameras: document.getElementById('amenity-cameras').checked };
        
        const hostelData = { name, location, description, amenities, price: Number(price), term, phone: normalizeWhatsAppNumber(phone), landlordId: user.uid, createdAt: serverTimestamp() };
        await addDoc(collection(db, 'hostels'), hostelData);
        alert("Hostel posted successfully!");
        hostelPostForm.reset();
        fetchPublicHostels();
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        toggleLoading(submitBtn, false, "Submit Listing");
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
            const card = document.createElement('div');
            card.className = 'hostel-card';
            const amenitiesHTML = Object.keys(hostel.amenities || {}).filter(key => hostel.amenities[key]).map(key => `<span><i class="fa-solid fa-check"></i> ${key.charAt(0).toUpperCase() + key.slice(1)}</span>`).join('');
            const localPhone = hostel.phone ? `0${hostel.phone.substring(3)}` : 'Not provided';
            
            card.innerHTML = `
                <img src="${hostel.imageUrls && hostel.imageUrls.length > 0 ? hostel.imageUrls[0] : 'https://via.placeholder.com/400x250.png?text=No+Image'}" alt="${hostel.name}" class="hostel-card-image">
                <div class="hostel-card-content">
                    <h3>${hostel.name}</h3>
                    <p>${hostel.description}</p>
                    <p><i class="fa-solid fa-location-dot"></i> ${hostel.location}</p>
                    <p><strong>UGX ${hostel.price.toLocaleString()}</strong> / ${hostel.term}</p>
                    <div class="amenities-grid">${amenitiesHTML}</div>
                </div>
                <div class="hostel-card-footer">
                    <a class="contact-link" data-phone="${localPhone}"><i class="fa-solid fa-copy"></i> Copy Phone: ${localPhone}</a>
                </div>
            `;
            publicHostelGrid.appendChild(card);
        });

        // Add event listeners for the new copy buttons
        document.querySelectorAll('.contact-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const phone = e.currentTarget.dataset.phone;
                navigator.clipboard.writeText(phone).then(() => {
                    e.currentTarget.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
                    setTimeout(() => {
                        e.currentTarget.innerHTML = `<i class="fa-solid fa-copy"></i> Copy Phone: ${phone}`;
                    }, 2000);
                });
            });
        });

    } catch (error) {
        publicHostelGrid.innerHTML = '<p>Could not load hostels.</p>';
    }
}

// --- INITIAL LOAD ---
fetchPublicHostels();