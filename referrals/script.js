import { auth, db } from '../js/auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, query, collection, where, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage } from '../js/shared.js';

// --- DOM ELEMENTS ---
const loader = document.getElementById('referral-loader');
const content = document.getElementById('referral-content');
const userReferralLinkEl = document.getElementById('user-referral-link');
const copyReferralLinkBtn = document.getElementById('copy-referral-link-btn');
const userReferralCountEl = document.getElementById('user-referral-count');
const messageEl = document.getElementById('global-message');

// --- INITIALIZATION ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // Step 1: Get the current user's profile data to find their referral code
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                throw new Error("Could not find your user profile.");
            }
            const userData = userDoc.data();
            const referralCode = userData.referralCode || 'N/A';
            
            // Generate and display the full referral link
            userReferralLinkEl.value = `${window.location.origin}/signup/?ref=${referralCode}`;

            // Step 2: Run the simple query to count referred users
            const referralsQuery = query(collection(db, 'users'), where('referrerId', '==', user.uid));
            const referralsSnapshot = await getDocs(referralsQuery);
            const actualReferralCount = referralsSnapshot.size;
            
            userReferralCountEl.textContent = actualReferralCount;

            // Step 3: Update the count in the user's profile if it's out of sync
            if (userData.referralCount !== actualReferralCount) {
                await updateDoc(userDocRef, { referralCount: actualReferralCount });
            }

        } catch (error) {
            console.error("Error loading referral data:", error);
            showMessage(messageEl, 'Failed to load referral data. Please check the console for errors.', true);
        } finally {
            loader.style.display = 'none';
            content.style.display = 'block';
        }
    }
});

// --- EVENT LISTENERS ---
copyReferralLinkBtn.addEventListener('click', () => {
    if (userReferralLinkEl.value === 'Loading your link...') return;
    
    userReferralLinkEl.select();
    navigator.clipboard.writeText(userReferralLinkEl.value).then(() => {
        const originalText = copyReferralLinkBtn.innerHTML;
        copyReferralLinkBtn.innerHTML = 'Copied!';
        setTimeout(() => { copyReferralLinkBtn.innerHTML = `<i class="fa-solid fa-copy"></i> Copy`; }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        showMessage(messageEl, 'Could not copy code.', true);
    });
});