import { auth, db } from '../js/auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, query, collection, where, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage } from '../js/shared.js';

// --- DOM ELEMENTS ---
const loader = document.getElementById('referral-loader');
const content = document.getElementById('referral-content');
const userReferralCodeEl = document.getElementById('user-referral-code');
const userReferralCountEl = document.getElementById('user-referral-count');
const messageEl = document.getElementById('global-message');

// --- INITIALIZATION ---
// This runs when the page loads and Firebase confirms the user's login status.
// The page is protected by shared.js, so we know a user will be present.
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // Step 1: Get the current user's profile data
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                throw new Error("Could not find your user profile.");
            }

            const userData = userDoc.data();
            const referralCode = userData.referralCode || 'N/A';
            userReferralCodeEl.textContent = referralCode;

            // Step 2: Run the simple query to count referred users
            // This uses the same reliable logic as your original sell.js
            const referralsQuery = query(collection(db, 'users'), where('referrerId', '==', user.uid));
            const referralsSnapshot = await getDocs(referralsQuery);
            const actualReferralCount = referralsSnapshot.size;
            
            // Display the count on the page
            userReferralCountEl.textContent = actualReferralCount;

            // Step 3 (Optional but good practice): Update the count in the user's profile if it's out of sync
            if (userData.referralCount !== actualReferralCount) {
                await updateDoc(userDocRef, { referralCount: actualReferralCount });
            }

        } catch (error) {
            console.error("Error loading referral data:", error);
            showMessage(messageEl, 'Failed to load referral data. Please check the console for errors.', true);
        } finally {
            // This always runs, ensuring the page never gets stuck on loading
            loader.style.display = 'none';
            content.style.display = 'block';
        }
    }
});

// --- EVENT LISTENERS ---
// Handle clicking on the referral code to copy it
userReferralCodeEl.addEventListener('click', () => {
    if (userReferralCodeEl.textContent === 'Loading...') return;
    
    navigator.clipboard.writeText(userReferralCodeEl.textContent).then(() => {
        showMessage(messageEl, 'Referral code copied to clipboard!', false);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        showMessage(messageEl, 'Could not copy code.', true);
    });
});