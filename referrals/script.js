import { auth, db } from '../js/auth.js';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, runTransaction, writeBatch, increment } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading } from '../js/shared.js';

// --- DOM ELEMENTS ---
const loader = document.getElementById('referral-loader');
const content = document.getElementById('referral-content');
const messageEl = document.getElementById('global-message');

const referralLinkInput = document.getElementById('referral-link-input');
const copyReferralLinkBtn = document.getElementById('copy-referral-link-btn');

const currentPointsEl = document.getElementById('current-points');
const pointsProgressBar = document.getElementById('points-progress-bar');
const pointsProgressText = document.getElementById('points-progress-text');
const redeemButton = document.getElementById('redeem-button');
const totalEarningsEl = document.getElementById('total-earnings');

const referralCountEl = document.getElementById('referral-count');
const referralListContainer = document.getElementById('referral-list-container');
const noReferralsMessage = document.getElementById('no-referrals-message');

// --- CONFIGURATION ---
const POINTS_PER_REFERRAL = 10;
const POINTS_FOR_REDEEM = 1000;
const REDEEM_AMOUNT = 50;

let currentUser = null;

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await syncAndLoadReferralData(user);
    }
});

/**
 * Main function to sync new referrals and then display all data.
 * @param {User} user The currently authenticated Firebase user.
 */
async function syncAndLoadReferralData(user) {
    const userDocRef = doc(db, 'users', user.uid);

    try {
        // --- STEP 1: Sync Points ---
        // Find new valid referrals that haven't been credited yet.
        const q = query(collection(db, 'users'), where('referrerId', '==', user.uid));
        const referralsSnapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        let newPointsToAward = 0;

        for (const referredUserDoc of referralsSnapshot.docs) {
            const referredUserData = referredUserDoc.data();

            // Check if points have already been awarded for this referral
            if (!referredUserData.pointsAwardedToReferrer) {
                const productsQuery = query(collection(db, 'products'), where('sellerId', '==', referredUserDoc.id));
                const productsSnapshot = await getDocs(productsQuery);
                
                let isNowValid = false;
                for (const productDoc of productsSnapshot.docs) {
                    if (productDoc.data().imageUrls && productDoc.data().imageUrls.length > 0) {
                        isNowValid = true;
                        break;
                    }
                }

                if (isNowValid) {
                    newPointsToAward += POINTS_PER_REFERRAL;
                    const referredUserRef = doc(db, 'users', referredUserDoc.id);
                    batch.update(referredUserRef, { pointsAwardedToReferrer: true });
                }
            }
        }

        // If we found new valid referrals, update the referrer's point balance
        if (newPointsToAward > 0) {
            batch.update(userDocRef, {
                referralPoints: increment(newPointsToAward),
                lifetimeReferralPoints: increment(newPointsToAward)
            });
            await batch.commit(); // Commit all updates at once
        }

        // --- STEP 2: Load Final Data and Display ---
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) throw new Error("Current user not found in database.");
        
        const userData = userDoc.data();
        const currentPoints = userData.referralPoints || 0;

        // Populate Referral Link
        referralLinkInput.value = `${window.location.origin}/signup/?ref=${userData.referralCode}`;

        // Update Points UI
        currentPointsEl.textContent = currentPoints;
        const progressPercentage = Math.min((currentPoints / POINTS_FOR_REDEEM) * 100, 100);
        pointsProgressBar.style.width = `${progressPercentage}%`;
        pointsProgressText.textContent = `${currentPoints} / ${POINTS_FOR_REDEEM} points to cash out`;
        
        // Update Earnings and Redemption Status
        const totalEarnings = (userData.referralPayouts || 0) * REDEEM_AMOUNT;
        totalEarningsEl.textContent = `$${totalEarnings.toFixed(2)}`;
        redeemButton.disabled = currentPoints < POINTS_FOR_REDEEM;

        // Render the list of all referred members
        renderReferralList(referralsSnapshot.docs);

    } catch (error) {
        console.error("Error loading referral data:", error);
        showMessage(messageEl, 'Failed to load referral data.', true);
    } finally {
        loader.style.display = 'none';
        content.style.display = 'block';
    }
}

function renderReferralList(allReferrals) {
    referralListContainer.innerHTML = ''; // Clear previous list
    referralCountEl.textContent = allReferrals.length;

    if (allReferrals.length === 0) {
        noReferralsMessage.style.display = 'block';
        return;
    }
    
    noReferralsMessage.style.display = 'none';
    allReferrals.forEach(doc => {
        const referral = doc.data();
        const status = referral.pointsAwardedToReferrer ? 'Valid' : 'Pending';

        const referralItem = document.createElement('div');
        referralItem.className = 'referral-item';
        referralItem.innerHTML = `
            <img src="${referral.profilePhotoUrl || 'https://placehold.co/50x50/e0e0e0/777?text=U'}" alt="${referral.name}">
            <div class="referral-details">
                <h3>${referral.name || 'New User'}</h3>
                <p>Joined on: ${referral.createdAt.toDate().toLocaleDateString()}</p>
            </div>
            <span class="referral-status ${status.toLowerCase()}">${status}</span>
        `;
        referralListContainer.appendChild(referralItem);
    });
}

copyReferralLinkBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(referralLinkInput.value).then(() => {
        const originalText = copyReferralLinkBtn.innerHTML;
        copyReferralLinkBtn.innerHTML = 'Copied!';
        setTimeout(() => { copyReferralLinkBtn.innerHTML = originalText; }, 2000);
    });
});

redeemButton.addEventListener('click', async () => {
    if (!currentUser || redeemButton.disabled) return;
    if (!confirm(`Are you sure you want to redeem ${POINTS_FOR_REDEEM} points for $${REDEEM_AMOUNT}? The points will be deducted from your account.`)) return;
    
    toggleLoading(redeemButton, true, 'Redeeming...');
    const userDocRef = doc(db, 'users', currentUser.uid);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error("User document not found.");

            const currentPoints = userDoc.data().referralPoints || 0;
            if (currentPoints < POINTS_FOR_REDEEM) {
                throw new Error("You do not have enough points to redeem.");
            }

            // The robust deduction logic
            transaction.update(userDocRef, {
                referralPoints: increment(-POINTS_FOR_REDEEM), // Deduct points
                referralPayouts: increment(1) // Increment payout counter
            });
            // In a real app, this would also trigger a notification to you (the admin)
        });
        
        showMessage(messageEl, `Redemption successful! We will contact you about your $${REDEEM_AMOUNT} payout.`, false);
        await syncAndLoadReferralData(currentUser); // Reload data to show updated state

    } catch (error) {
        console.error("Redemption failed:", error);
        showMessage(messageEl, `Error: ${error.message}`, true);
    } finally {
        toggleLoading(redeemButton, false, `Redeem $${REDEEM_AMOUNT}`);
    }
});