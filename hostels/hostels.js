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
const publicHostelGrid = document.getElementById('hostel-grid-public');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

// --- HELPER FUNCTIONS (UNCHANGED) ---
const toggleLoading = (button, isLoading, originalText) => { /* ... full function from previous step ... */ };
function normalizeWhatsAppNumber(phone) { /* ... full function from previous step ... */ }

// --- AUTH LOGIC ---
onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        initialView.style.display = 'none';
        dashboardContainer.style.display = 'block';
        // Populate dashboard with user's specific info and listings
    } else {
        initialView.style.display = 'block';
        dashboardContainer.style.display = 'none';
    }
});

// --- UI LOGIC ---
if (showAuthBtn) {
    showAuthBtn.addEventListener('click', () => {
        authContainer.style.display = authContainer.style.display === 'none' ? 'block' : 'none';
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

// --- HOSTEL FETCH LOGIC (UNCHANGED) ---
async function fetchPublicHostels() {
    if (!publicHostelGrid) return;
    publicHostelGrid.innerHTML = '<p>Loading...</p>';
    const q = query(collection(db, 'hostels'), orderBy('createdAt', 'desc'));
    try {
        const querySnapshot = await getDocs(q);
        publicHostelGrid.innerHTML = '';
        if (querySnapshot.empty) { publicHostelGrid.innerHTML = '<p>No hostels posted.</p>'; return; }
        querySnapshot.forEach((doc) => {
            const hostel = doc.data();
            const card = document.createElement('div');
            card.className = 'hostel-card';
            const localPhone = hostel.phone ? `0${hostel.phone.substring(3)}` : 'Not provided';
            card.innerHTML = `
                <div class="hostel-card-content"><h3>${hostel.name}</h3></div>
                <div class="hostel-card-footer">
                    <a class="contact-link" data-phone="${localPhone}"><i class="fa-solid fa-copy"></i> Copy Phone: ${localPhone}</a>
                </div>`;
            publicHostelGrid.appendChild(card);
        });
        document.querySelectorAll('.contact-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const phone = e.currentTarget.dataset.phone;
                navigator.clipboard.writeText(phone).then(() => {
                    e.currentTarget.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
                    setTimeout(() => { e.currentTarget.innerHTML = `<i class="fa-solid fa-copy"></i> Copy Phone: ${phone}`; }, 2000);
                });
            });
        });
    } catch (error) {
        publicHostelGrid.innerHTML = '<p>Could not load hostels.</p>';
    }
}

// --- INITIAL LOAD ---
fetchPublicHostels();