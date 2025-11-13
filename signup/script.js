import { auth, db } from '/js/auth.js';
import { createUserWithEmailAndPassword, sendEmailVerification, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, setDoc, query, collection, where, getDocs, serverTimestamp, addDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading, normalizeWhatsAppNumber } from '/js/shared.js';

// --- DOM ELEMENTS ---
const signupForm = document.getElementById('signup-form');
const signupErrorElement = document.getElementById('signup-error');
const signupPatienceMessage = document.getElementById('signup-patience-message');

// This is a failsafe. The main redirect logic is in shared.js.
onAuthStateChanged(auth, (user) => {
    if (user) {
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

// --- Helper to check for active promos ---
async function getCurrentBaseReward() {
  const DEFAULT_REWARD = 200; // Your default base reward in UGX
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

    let referrerId = null;
    let referrerEmail = null;

    // --- *** START OF FIX *** ---
    // Step 1: Check referral code *before* trying to create a user.
    // Your new rules will allow this query to work.
    if (referralCode) {
        try {
            const q = query(collection(db, "users"), where("referralCode", "==", referralCode));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                // This is a user error (soft error)
                showMessage(signupErrorElement, `Referral code "${referralCode}" was not found.`);
                toggleLoading(signupButton, false, 'Create Account');
                signupPatienceMessage.style.display = 'none';
                return; // Stop the signup
            } else {
                // Success! Store the referrer's info
                referrerId = querySnapshot.docs[0].id;
                referrerEmail = querySnapshot.docs[0].data().email;
            }
        } catch (queryError) {
            // This is a "hard" error (e.g., permissions, index, network)
            console.error("Referral query failed:", queryError);
            showMessage(signupErrorElement, `A database error occurred checking the code. Please try again.`);
            toggleLoading(signupButton, false, 'Create Account');
            signupPatienceMessage.style.display = 'none';
            return; // Stop the function
        }
    }
    // --- *** END OF FIX *** ---

    
    // Step 2: Try to create the user (Auth, setDoc, addDoc)
    // This block only runs if the referral check passed or was skipped.
    try {
        // Step 2a: Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Step 2b: Create the new user's document in the 'users' collection
        // This 'setDoc' will now work because of your new, simpler 'create' rule.
        await setDoc(doc(db, "users", user.uid), {
            name,
            fullName: name, 
            email,
            whatsapp: normalizeWhatsAppNumber(whatsapp),
            location,
            institution,
            phone: whatsapp,
            role: 'seller', // Default role
            isSeller: true,
            isVerified: false,
            createdAt: serverTimestamp(),
            referralCode: user.uid.substring(0, 6).toUpperCase(), // New user's own code
            referrerId: referrerId, // ID of the person who referred them
            badges: [], 
            referralBalance: 0, 
            referralCount: 0  
        });

        // Step 2c: Create a validation request for the admin if there was a referrer
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

        // Step 2d: Send the verification email
        await sendEmailVerification(user);

        // Step 2e: Redirect to the new verification page on success
        window.location.href = '/verify-email/';

    } catch (error) {
        // This 'catch' block will now only handle errors from
        // createUserWithEmailAndPassword, setDoc, or addDoc.
        let msg = 'An error occurred. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
            msg = 'This email is already registered. Please <a href="/login/">log in</a>.';
        } else if (error.code === 'auth/weak-password') {
            msg = 'Password must be at least 6 characters long.';
        }
        showMessage(signupErrorElement, msg);
        console.error("Signup Error:", error);

        // Reset button ONLY if the creation fails
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