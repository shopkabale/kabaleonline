import { auth, db } from '/js/auth.js';
import { createUserWithEmailAndPassword, sendEmailVerification, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp, addDoc, getDoc, writeBatch, collection } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading, normalizeWhatsAppNumber } from '/js/shared.js';

// --- DOM ELEMENTS ---
const signupForm = document.getElementById('signup-form');
const signupErrorElement = document.getElementById('signup-error');
const signupPatienceMessage = document.getElementById('signup-patience-message');

// --- *** THIS IS THE FIX *** ---
// We REMOVE the onAuthStateChanged listener that was here.
// It was causing the redirect before the script could finish.
// --- *** END OF FIX *** ---

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
    console.clear(); 
    console.log("--- 1. SIGNUP PROCESS STARTED (FINAL VERSION) ---");

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
    if (referralCode) {
        console.log(`--- 2. Checking code in PUBLIC /referralCodes/${referralCode} ...`);
        try {
            const codeRef = doc(db, "referralCodes", referralCode);
            const codeSnap = await getDoc(codeRef);
            
            if (!codeSnap.exists()) {
                console.error(`--- 3. CODE NOT FOUND.`);
                showMessage(signupErrorElement, `Referral code "${referralCode}" was not found.`);
                toggleLoading(signupButton, false, 'Create Account');
                signupPatienceMessage.style.display = 'none';
                return; // STOP
            } else {
                referrerId = codeSnap.data().userId;
                referrerEmail = codeSnap.data().userEmail;
                console.log(`--- 3. CODE FOUND! Referrer ID: ${referrerId} ---`);
            }
        } catch (queryError) {
            console.error("--- 3. GETDOC FAILED (NETWORK/OTHER ERROR): ---", queryError);
            showMessage(signupErrorElement, `A database error occurred checking the code.`);
            toggleLoading(signupButton, false, 'Create Account');
            signupPatienceMessage.style.display = 'none';
            return; // Stop
        }
    } else {
        console.log("--- 2. No referral code entered. Skipping check. ---");
    }

    
    // --- 3. Account Creation ---
    try {
        console.log("--- 4. Creating Firebase Auth user... ---");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log(`--- 5. AUTH SUCCESS. New User UID: ${user.uid} ---`);
        
        // --- 4. Firestore Batch Write ---
        const newUserReferralCode = user.uid.substring(0, 6).toUpperCase();
        
        console.log("--- 6. Preparing batch write... ---");
        const batch = writeBatch(db);

        // Doc 1: The private user doc
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
            referralCode: newUserReferralCode, 
            referrerId: referrerId,
            badges: [], 
            referralBalance: 0, 
            referralCount: 0  
        });

        // Doc 2: The public lookup doc
        const codeRef = doc(db, "referralCodes", newUserReferralCode);
        batch.set(codeRef, {
            userId: user.uid,
            userEmail: email 
        });

        // Commit batch
        await batch.commit();
        console.log("--- 7. BATCH WRITE SUCCESS: User and referral code created. ---");

        // --- 5. Referral Log Creation ---
        if (referrerId) {
            console.log("--- 8. ReferrerID is VALID. Trying to create referral_log... ---");
            const currentReward = await getCurrentBaseReward();
            const logData = { 
                referrerId: referrerId,
                referrerEmail: referrerEmail,
                referredUserId: user.uid,
                referredUserName: name,
                status: "pending",
                baseReward: currentReward, 
                createdAt: serverTimestamp()
            };
            
            await addDoc(collection(db, "referral_log"), logData);
            
            console.log("--- 9. FIRESTORE SUCCESS: referral_log document created. ---");
        } else {
            console.log("--- 8. ReferrerID is NULL. Skipping referral_log creation. ---");
        }

        // --- 6. Final Steps ---
        // This is the ONLY redirect that should happen.
        console.log("--- 10. Sending verification email... ---");
        await sendEmailVerification(user);
        console.log("--- 11. Email sent. Redirecting to /verify-email/ ---");
        window.location.href = '/verify-email/';

    } catch (error) {
        console.error("--- !!! FATAL ERROR DURING SIGNUP !!! ---", error);
        let msg = 'An error occurred. Please try again.';
        if (error.code === 'auth/email-already-in-use') { msg = 'This email is already registered.'; } 
        else if (error.code === 'permission-denied') { msg = 'A database rule error occurred.'; }
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