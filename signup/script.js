import { auth, db } from '/js/auth.js';
import { createUserWithEmailAndPassword, sendEmailVerification, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, setDoc, query, collection, where, getDocs, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading, normalizeWhatsAppNumber } from '/js/shared.js';

// --- DOM ELEMENTS ---
const signupForm = document.getElementById('signup-form');
const signupErrorElement = document.getElementById('signup-error');
const signupPatienceMessage = document.getElementById('signup-patience-message');

// This is a failsafe. The main redirect logic is in shared.js.
onAuthStateChanged(auth, (user) => {
    if (user) {
        // If a logged-in user somehow lands here, send them away.
        const currentPage = window.location.pathname;
        if (currentPage.startsWith('/signup/')) {
             window.location.replace('/dashboard/');
        }
    }
});

// Check for referral code in URL on page load and pre-fill the input
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
        const referralInput = document.getElementById('referral-code');
        if (referralInput) {
            referralInput.value = refCode.toUpperCase();
        }
    }
});

// Main signup form submission logic
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const whatsapp = document.getElementById('signup-whatsapp').value;
    const location = document.getElementById('signup-location').value;
    const institution = document.getElementById('signup-institution').value;
    const password = document.getElementById('signup-password').value;
    const referralCode = document.getElementById('referral-code').value.trim().toUpperCase();
    const signupButton = signupForm.querySelector('button[type="submit"]');

    if (!name || !email || !password || !location || !whatsapp) {
        return showMessage(signupErrorElement, "Please fill out all required fields.");
    }

    toggleLoading(signupButton, true, 'Creating Account...');
    signupPatienceMessage.style.display = 'block';

    try {
        // Step 1: Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        let referrerId = null;
        let referrerEmail = null;

        // Check if a valid referral code was used
        if (referralCode) {
            const q = query(collection(db, "users"), where("referralCode", "==", referralCode));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                referrerId = querySnapshot.docs[0].id;
                referrerEmail = querySnapshot.docs[0].data().email;
            }
        }
        
        // Step 2: Create the new user's document in the 'users' collection
        await setDoc(doc(db, "users", user.uid), {
            name,
            email,
            whatsapp: normalizeWhatsAppNumber(whatsapp),
            location,
            institution,
            role: 'seller',
            isVerified: false,
            createdAt: serverTimestamp(),
            referralCode: user.uid.substring(0, 6).toUpperCase(),
            referrerId: referrerId,
            referralValidationRequested: false, // For the Admin-Approval system
            badges: [],
            referralBalanceUGX: 0
        });

        // Step 3: Create a validation request for the admin if there was a referrer
        if (referrerId) {
            await addDoc(collection(db, "referralValidationRequests"), {
                referrerId: referrerId,
                referrerEmail: referrerEmail,
                referredUserId: user.uid,
                referredUserName: name,
                status: "pending",
                createdAt: serverTimestamp()
            });
        }

        // Step 4: Send the verification email
        await sendEmailVerification(user);

        // Step 5: Redirect to the new verification page
        window.location.href = '/verify-email/';

    } catch (error) {
        let msg = 'An error occurred. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
            msg = 'This email is already registered. Please <a href="/login/">log in</a>.';
        } else if (error.code === 'auth/weak-password') {
            msg = 'Password must be at least 6 characters long.';
        }
        showMessage(signupErrorElement, msg);
        console.error("Signup Error:", error);
    } finally {
        toggleLoading(signupButton, false, 'Create Account');
        signupPatienceMessage.style.display = 'none';
    }
});

// Password Toggle Visibility
document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
        const passwordInput = e.target.closest('.password-wrapper').querySelector('input');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            e.target.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            e.target.textContent = '👁️';
        }
    });
});