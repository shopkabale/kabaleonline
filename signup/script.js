import { auth, db } from '/js/auth.js';
import { createUserWithEmailAndPassword, sendEmailVerification, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, setDoc, query, collection, where, getDocs, serverTimestamp, addDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js"; // Added getDoc
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

// --- NEW: Helper to check for active promos ---
async function getCurrentBaseReward() {
  const DEFAULT_REWARD = 200; // Your default base reward in UGX
  try {
    const promoRef = doc(db, "siteConfig", "promotions");
    const promoSnap = await getDoc(promoRef);

    if (promoSnap.exists()) {
      const promo = promoSnap.data();
      const expires = promo.expires?.toDate();
      
      // Check if promo is active and not expired
      if (promo.active && expires && expires > new Date()) {
        console.log(`Promo '${promo.activeCampaign}' is active! Applying multiplier.`);
        return DEFAULT_REWARD * (promo.baseRewardMultiplier || 1);
      }
    }
  } catch (err) {
    console.warn("Could not check for promotions", err);
  }
  return DEFAULT_REWARD;
}


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
        // *** UPDATED to match your screenshot/referral logic ***
        await setDoc(doc(db, "users", user.uid), {
            name,
            fullName: name, // From your screenshot
            email,
            whatsapp: normalizeWhatsAppNumber(whatsapp),
            location,
            institution,
            phone: whatsapp, // From your screenshot
            role: 'seller',
            isSeller: true, // From your screenshot
            isVerified: false,
            createdAt: serverTimestamp(),
            referralCode: user.uid.substring(0, 6).toUpperCase(),
            referrerId: referrerId,
            badges: [], // NEW: Added for rewards
            referralBalance: 0, // NEW: Changed from referralBalanceUGX
            referralCount: 0  // NEW: Added for rewards
        });

        // Step 3: Create a validation request for the admin if there was a referrer
        // *** UPDATED to use 'referral_log' and add 'baseReward' ***
        if (referrerId) {
            // Get the current reward (checks for promos)
            const currentReward = await getCurrentBaseReward();

            await addDoc(collection(db, "referral_log"), { // UPDATED collection name
                referrerId: referrerId,
                referrerEmail: referrerEmail,
                referredUserId: user.uid,
                referredUserName: name,
                status: "pending",
                baseReward: currentReward, // NEW: Locks in the reward amount
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