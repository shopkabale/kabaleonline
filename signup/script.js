import { auth, db } from '/js/auth.js';
import { 
    createUserWithEmailAndPassword, 
    sendEmailVerification, 
    signOut 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    query, 
    collection, 
    where, 
    getDocs, 
    updateDoc, 
    increment, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading, normalizeWhatsAppNumber } from '/js/shared.js';

// Note: Page protection/redirection for already-logged-in users is handled in shared.js

const signupForm = document.getElementById('signup-form');
const signupErrorElement = document.getElementById('signup-error');
const authSuccessElement = document.getElementById('auth-success');
const signupPatienceMessage = document.getElementById('signup-patience-message');
const emailVerificationPrompt = document.getElementById('email-verification-prompt');
const authContainer = document.getElementById('auth-container');
const resendVerificationBtn = document.getElementById('resend-verification-btn');
const verificationLogoutBtn = document.getElementById('verification-logout-btn');

// Check for referral code in URL on page load and populate the input field
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

    if (!name || !location || !whatsapp) {
        return showMessage(signupErrorElement, "Please fill out all required fields.");
    }

    toggleLoading(signupButton, true, 'Creating Account...');
    signupPatienceMessage.style.display = 'block';

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        let referrerId = null;

        // If a referral code was used, find the referrer and update their count
        if (referralCode) {
            const q = query(collection(db, "users"), where("referralCode", "==", referralCode));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                referrerId = querySnapshot.docs[0].id;
                const referrerRef = doc(db, 'users', referrerId);
                await updateDoc(referrerRef, { referralCount: increment(1) });
            } else {
                 console.warn("Referral code was provided but not found:", referralCode);
            }
        }
        
        // Create the new user's document in Firestore
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            whatsapp: normalizeWhatsAppNumber(whatsapp),
            location: location,
            institution: institution,
            role: 'seller',
            isVerified: false,
            createdAt: serverTimestamp(),
            referralCount: 0,
            referrerId: referrerId,
            referralCode: user.uid.substring(0, 6).toUpperCase(),
            badges: []
        });

        // Send the verification email
        await sendEmailVerification(user);

        // Hide the signup form and show the verification prompt
        authContainer.style.display = 'none';
        emailVerificationPrompt.style.display = 'block';
        emailVerificationPrompt.querySelector('.user-email').textContent = user.email;

    } catch (error) {
        let msg = 'An error occurred. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
            msg = 'This email is already registered. Please <a href="/login/">log in</a>.';
        }
        if (error.code === 'auth/weak-password') {
            msg = 'Password must be at least 6 characters long.';
        }
        showMessage(signupErrorElement, msg);
    } finally {
        toggleLoading(signupButton, false, 'Create Account');
        signupPatienceMessage.style.display = 'none';
    }
});

// Logic for the email verification prompt
resendVerificationBtn.addEventListener('click', async () => {
    if (!auth.currentUser) return;
    toggleLoading(resendVerificationBtn, true, 'Sending...');
    try {
        await sendEmailVerification(auth.currentUser);
        showMessage(authSuccessElement, "A new verification email has been sent.", false);
    } catch (error) {
        showMessage(authSuccessElement, "Failed to send email. Please try again soon.", true);
    } finally {
        toggleLoading(resendVerificationBtn, false, 'Resend Verification Email');
    }
});

verificationLogoutBtn.addEventListener('click', () => {
    signOut(auth);
    window.location.href = '/login/';
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