import { auth, db } from '/js/auth.js';
import { createUserWithEmailAndPassword, sendEmailVerification, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, setDoc, query, collection, where, getDocs, serverTimestamp, addDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
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
             console.log("[DEBUG] User is already logged in. Redirecting to dashboard.");
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
            console.log(`[DEBUG] Pre-filled referral code from URL: ${refCode.toUpperCase()}`);
        }
    }
});

// --- Helper to check for active promos ---
async function getCurrentBaseReward() {
  const DEFAULT_REWARD = 200; 
  console.log("[DEBUG] Checking for promo...");
  try {
    const promoRef = doc(db, "siteConfig", "promotions");
    const promoSnap = await getDoc(promoRef);
    if (promoSnap.exists()) {
      const promo = promoSnap.data();
      const expires = promo.expires?.toDate();
      if (promo.active && expires && expires > new Date()) {
        const newReward = DEFAULT_REWARD * (promo.baseRewardMultiplier || 1);
        console.log(`[DEBUG] Active promo found. Base reward set to: ${newReward}`);
        return newReward;
      }
    }
  } catch (err) {
    console.warn("[DEBUG] Could not check for promotions", err);
  }
  console.log(`[DEBUG] No active promo. Base reward is default: ${DEFAULT_REWARD}`);
  return DEFAULT_REWARD;
}


// =======================================================
// MAIN SIGNUP LOGIC
// =======================================================
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.clear(); // Clear console for a clean test
    console.log("===================================");
    console.log("--- 1. SIGNUP PROCESS STARTED ---");
    console.log("===================================");

    // --- 1a. Get All Form Values ---
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const whatsapp = document.getElementById('signup-whatsapp').value;
    const location = document.getElementById('signup-location').value;
    const institution = document.getElementById('signup-institution').value;
    const password = document.getElementById('signup-password').value;
    const referralCode = document.getElementById('referral-code').value.trim().toUpperCase();
    const signupButton = signupForm.querySelector('button[type="submit"]');

    console.log(`[DEBUG] Form Data:
      Name: ${name}
      Email: ${email}
      WhatsApp: ${whatsapp}
      Location: ${location}
      Institution: ${institution}
      Referral Code: "${referralCode}"`);

    // --- 1b. Client-side Validation ---
    if (!name || !email || !password || !location || !whatsapp) {
        console.error("[DEBUG] Form validation failed: Missing required fields.");
        return showMessage(signupErrorElement, "Please fill out all required fields.");
    }

    toggleLoading(signupButton, true, 'Creating Account...');
    signupPatienceMessage.style.display = 'block';

    let referrerId = null;
    let referrerEmail = null;

    // --- 2. Referral Code Check ---
    if (referralCode) {
        console.log("--- 2. Checking referral code in Firestore... ---");
        try {
            const q = query(collection(db, "users"), where("referralCode", "==", referralCode));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                console.error(`--- 3. QUERY FAILED (LOGIC): Code "${referralCode}" NOT FOUND. Query ran but found 0 users. ---`);
                showMessage(signupErrorElement, `Referral code "${referralCode}" was not found.`);
                toggleLoading(signupButton, false, 'Create Account');
                signupPatienceMessage.style.display = 'none';
                return; // STOP
            } else {
                referrerId = querySnapshot.docs[0].id;
                referrerEmail = querySnapshot.docs[0].data().email;
                console.log(`--- 3. QUERY SUCCESS: Found referrer!
      Referrer ID: ${referrerId}
      Referrer Email: ${referrerEmail} ---`);
            }
        } catch (queryError) {
            console.error("--- 3. QUERY FAILED (DATABASE ERROR): 'Missing or insufficient permissions.' ---");
            console.error(queryError);
            showMessage(signupErrorElement, `A database error occurred checking the code. (Check console for rules error)`);
            toggleLoading(signupButton, false, 'Create Account');
            signupPatienceMessage.style.display = 'none';
            return; // STOP
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
        
        // --- 4. Firestore Document Creation ---
        const newUserReferralCode = user.uid.substring(0, 6).toUpperCase();
        const userData = {
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
            referrerId: referrerId, // This will be null or a valid ID
            badges: [], 
            referralBalance: 0, 
            referralCount: 0  
        };

        console.log("--- 6. Trying to create user document in Firestore... ---");
        console.log("[DEBUG] Data to be written to /users/" + user.uid, userData);
        
        await setDoc(doc(db, "users", user.uid), userData);
        
        console.log("--- 7. FIRESTORE SUCCESS: User document created. ---");

        // --- 5. Referral Log Creation (The Critical Step) ---
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
            
            console.log("[DEBUG] Data to be written to /referral_log/", logData);
            await addDoc(collection(db, "referral_log"), logData);
            
            console.log("--- 9. FIRESTORE SUCCESS: referral_log document created. ---");
        } else {
            console.log("--- 8. ReferrerID is NULL. Skipping referral_log creation. ---");
        }

        // --- 6. Final Steps ---
        console.log("--- 10. Sending verification email... ---");
        await sendEmailVerification(user);
        console.log("--- 11. Email sent. Redirecting to /verify-email/ ---");
        window.location.href = '/verify-email/';

    } catch (error) {
        console.error("--- !!! FATAL ERROR DURING SIGNUP !!! ---");
        console.error(error);

        let msg = 'An error occurred. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
            msg = 'This email is already registered. Please <a href="/login/">log in</a>.';
        } else if (error.code === 'auth/weak-password') {
            msg = 'Password must be at least 6 characters long.';
        } else if (error.code === 'permission-denied' || error.code === 'unavailable') {
             msg = 'A database rule error occurred. (Check console for details)';
        }
        
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