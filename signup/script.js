import { auth, db } from '/js/auth.js';
import { createUserWithEmailAndPassword, sendEmailVerification, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
// Make sure to import 'getDoc' and 'writeBatch'
import { doc, setDoc, serverTimestamp, addDoc, getDoc, writeBatch, collection } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading, normalizeWhatsAppNumber } from '/js/shared.js';

// --- DOM ELEMENTS ---
const signupForm = document.getElementById('signup-form');
const signupErrorElement = document.getElementById('signup-error');
const signupPatienceMessage = document.getElementById('signup-patience-message');

// --- Failsafe redirect ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        const currentPage = window.location.pathname;
        if (currentPage.startsWith('/signup/')) {
             window.location.replace('/dashboard/');
        }
    }
});

// --- Pre-fill referral code from URL ---
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

// --- Helper to check for active promos ---
async function getCurrentBaseReward() {
  const DEFAULT_REWARD = 200; 
  try {
    const promoRef = doc(db, "siteConfig", "promotions");
    const promoSnap = await getDoc(promoRef);
    if (promoSnap.exists()) {
      const promo = promoSnap.data();
      const expires = promo.expires?.toDate();
      if (promo.active && expires && expires > new Date()) {
        return DEFAULT_REWARD * (promo.baseRewardMultiplier || 1);
      }
    }
  } catch (err) {
    console.warn("Could not check for promotions", err);
  }
  return DEFAULT_REWARD;
}


// =======================================================
// MAIN SIGNUP LOGIC
// =======================================================
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // --- 1. Get All Form Values ---
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

    let referrerId = null;
    let referrerEmail = null;

    // --- 2. Secure Referral Code Check ---
    // This checks the new, public /referralCodes collection
    if (referralCode) {
        try {
            const codeRef = doc(db, "referralCodes", referralCode);
            const codeSnap = await getDoc(codeRef);
            
            if (!codeSnap.exists()) {
                showMessage(signupErrorElement, `Referral code "${referralCode}" was not found.`);
                toggleLoading(signupButton, false, 'Create Account');
                signupPatienceMessage.style.display = 'none';
                return; // STOP
            } else {
                // Code is valid! Save the referrer's info
                referrerId = codeSnap.data().userId;
                referrerEmail = codeSnap.data().userEmail;
            }
        } catch (queryError) {
            // This will only fail if the user is offline
            console.error("Referral check failed:", queryError);
            showMessage(signupErrorElement, `A database error occurred checking the code.`);
            toggleLoading(signupButton, false, 'Create Account');
            signupPatienceMessage.style.display = 'none';
            return; // Stop
        }
    }
    
    // --- 3. Create Account and Database Documents ---
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // This is the new user's OWN referral code
        const newUserReferralCode = user.uid.substring(0, 6).toUpperCase();
        
        // Use a BATCH write to create both documents at once
        const batch = writeBatch(db);
        
        // Document 1: The private user doc in /users/
        const userRef = doc(db, "users", user.uid);
        batch.set(userRef, {
            name,
            fullName: name, 
            email,
            whatsapp: normalizeWhatsAppNumber(whatsapp),
            location,
            institution,
            phone: whatsapp,
            role: 'seller',
            isSeller: true,
            isVerified: false,
            createdAt: serverTimestamp(),
            referralCode: newUserReferralCode, // This new user's own code
            referrerId: referrerId, // The ID of the person who referred them
            badges: [], 
            referralBalance: 0, 
            referralCount: 0  
        });

        // Document 2: The public lookup doc in /referralCodes/
        // This automatically creates the code for all future users
        const codeRef = doc(db, "referralCodes", newUserReferralCode);
        batch.set(codeRef, {
            userId: user.uid,
            userEmail: email 
        });

        // Commit both documents to the database
        await batch.commit();
        
        // --- 4. Create Referral Log (if a code was used) ---
        if (referrerId) {
            const currentReward = await getCurrentBaseReward();
            await addDoc(collection(db, "referral_log"), { 
                referrerId: referrerId,
                referrerEmail: referrerEmail,
                referredUserId: user.uid,
                referredUserName: name,
                status: "pending",
                baseReward: currentReward, 
                createdAt: serverTimestamp()
            });
        }
        
        // --- 5. Final Steps ---
        await sendEmailVerification(user);
        window.location.href = '/verify-email/';

    } catch (error) {
        let msg = 'An error occurred. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
            msg = 'This email is already registered. Please <a href="/login/">log in</a>.';
        } else if (error.code === 'auth/weak-password') {
            msg = 'Password must be at least 6 characters long.';
        } else if (error.code === 'permission-denied') {
             msg = 'A database rule error occurred. Please try again later.';
        }
        
        console.error("Fatal signup error:", error);
        showMessage(signupErrorElement, msg);
        toggleLoading(signupButton, false, 'Create Account');
        signupPatienceMessage.style.display = 'none';
    }
});

// --- Password Toggle Visibility ---
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