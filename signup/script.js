import { auth, db } from '/js/auth.js';
import { createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp, addDoc, getDoc, writeBatch, collection } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading } from '/js/shared.js';

// --- DOM ELEMENTS ---
const signupForm = document.getElementById('signup-form');
const signupErrorElement = document.getElementById('signup-error');
const termsErrorElement = document.getElementById('terms-error'); // <-- NEW
const signupPatienceMessage = document.getElementById('signup-patience-message');
const termsCheckbox = document.getElementById('signup-terms'); // <-- NEW

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
// MAIN SIGNUP LOGIC (STREAMLINED)
// =======================================================
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // --- 1. Get All Form Values (Simplified) ---
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const referralCode = document.getElementById('referral-code').value.trim().toUpperCase();
    const signupButton = signupForm.querySelector('button[type="submit"]');

    // Clear previous errors
    showMessage(signupErrorElement, "");
    showMessage(termsErrorElement, "");

    // --- 2. VALIDATION CHECKS ---
    if (!email || !password) {
        return showMessage(signupErrorElement, "Please fill out all required fields.");
    }
    if (password.length < 6) {
        return showMessage(signupErrorElement, "Password must be at least 6 characters long.");
    }

    // --- THIS IS THE NEW CHECK ---
    if (!termsCheckbox.checked) {
        return showMessage(termsErrorElement, "You must agree to the Terms & Conditions to create an account.");
    }
    // --- END OF NEW CHECK ---

    toggleLoading(signupButton, true, 'Creating Account...');
    signupPatienceMessage.style.display = 'block';

    let referrerId = null;
    let referrerEmail = null;

    // --- 3. Secure Referral Code Check ---
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
                referrerId = codeSnap.data().userId;
                referrerEmail = codeSnap.data().userEmail;
            }
        } catch (queryError) {
            console.error("Referral check failed:", queryError);
            showMessage(signupErrorElement, `A database error occurred checking the code.`);
            toggleLoading(signupButton, false, 'Create Account');
            signupPatienceMessage.style.display = 'none';
            return; // Stop
        }
    }
    
    // --- 4. Create Account and Database Documents ---
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const newUserReferralCode = user.uid.substring(0, 6).toUpperCase();
        
        const batch = writeBatch(db);
        
        // Create the "skeleton" user document
        const userRef = doc(db, "users", user.uid);
        batch.set(userRef, {
            email: email,
            fullName: null, 
            name: "New User", 
            whatsapp: null,
            location: null,
            institution: null,
            phone: null,
            role: 'seller',
            isSeller: true,
            isVerified: false,
            createdAt: serverTimestamp(),
            hasSeenWelcomeModal: false, 
            referralCode: newUserReferralCode, 
            referrerId: referrerId,
            badges: [], 
            referralBalance: 0, 
            referralCount: 0  
        });

        // Create the public lookup doc
        const codeRef = doc(db, "referralCodes", newUserReferralCode);
        batch.set(codeRef, {
            userId: user.uid,
            userEmail: email 
        });

        await batch.commit();
        
        // --- 5. Create Referral Log & Auto-Process ---
        if (referrerId) {
            const currentReward = await getCurrentBaseReward();
            const logDocRef = await addDoc(collection(db, "referral_log"), { 
                referrerId: referrerId,
                referrerEmail: referrerEmail,
                referredUserId: user.uid,
                referredUserName: "New User", 
                status: "pending",
                baseReward: currentReward, 
                createdAt: serverTimestamp()
            });

            // Call the auto-approval function
            const idToken = await user.getIdToken();
            fetch('/.netlify/functions/process-referral', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ logId: logDocRef.id })
            }).catch(err => {
                console.error("Failed to trigger auto-process:", err);
            });
        }
        
        // --- 6. Final Steps ---
        await sendEmailVerification(user);
        window.location.href = '/dashboard/'; // Redirect to dashboard

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