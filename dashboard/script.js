import { auth, db } from '../js/auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    doc, updateDoc, serverTimestamp, onSnapshot, 
    query, collection, where, getDocs, limit, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM elements
const newUserNotification = document.getElementById('new-user-notification');
const notificationOkBtn = document.getElementById('notification-ok-btn');
const content = document.getElementById('dashboard-content');
const loader = document.getElementById('dashboard-loader');
const userProfilePhoto = document.getElementById('user-profile-photo');
const userDisplayName = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('logout-btn');

// --- Gamification DOM Elements ---
const adminNotificationBanner = document.getElementById('admin-notification-banner');
const promoBannerEl = document.getElementById('promo-banner');
const userWalletBalance = document.getElementById('user-wallet-balance');
const userBadgesDisplay = document.getElementById('user-badges-display');
const referralCountStat = document.getElementById('referral-count-stat');

let userDocRef = null;
let userListener = null; // To hold our snapshot listener

// --- Function to check for promos ---
async function displayActivePromo() {
  try {
    const promoRef = doc(db, "siteConfig", "promotions");
    const promoSnap = await getDoc(promoRef);

    if (promoSnap.exists()) {
      const promo = promoSnap.data();
      const expires = promo.expires?.toDate();

      if (promo.active && expires && expires > new Date()) {
        if (promoBannerEl) {
          promoBannerEl.innerHTML = `<div class="promo-banner">${promo.message || 'Special promotion active!'}</div>`;
          promoBannerEl.style.display = 'block';
        }
      }
    }
  } catch (err) {
    console.warn("Could not display promo", err);
  }
}

// --- Function to check for admin tasks ---
async function checkAdminStatus() {
    try {
        const q = query(
            collection(db, 'referral_log'), 
            where('status', '==', 'pending'), 
            limit(1)
        );
        const pendingSnap = await getDocs(q);

        if (!pendingSnap.empty) {
            if (adminNotificationBanner) {
                adminNotificationBanner.style.display = 'block';
            }
        }
    } catch (err) {
        console.warn("Admin check for pending referrals failed:", err);
    }
}


// Monitor auth state
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userDocRef = doc(db, 'users', user.uid);
        
        // Clean up any old listeners before starting a new one
        if (userListener) userListener(); 
        
        initializeDashboard(user);
        displayActivePromo(); 
    } else {
        if (userListener) userListener(); // Stop listening
        window.location.href = "/login/";
    }
});

// Initialize dashboard
async function initializeDashboard(user) {
    
    // --- *** THIS IS THE FIX *** ---
    // We REMOVE the old getDoc/setDoc logic that caused the race condition.
    // The dashboard's ONLY job is to listen for changes.
    // The 'onSnapshot' listener is "patient" and will wait
    // for signup.js to finish writing the document.
    
    userListener = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();

            // 1. Update basic profile info
            // This will now show the REAL name from signup, not "New User"
            userProfilePhoto.src = data.photoURL || data.profilePhotoUrl || 'https://placehold.co/100x100/e0e0e0/777?text=U';
            userDisplayName.textContent = data.fullName || data.name || 'Valued Seller';

            // 2. Update Gamification Module
            if (userWalletBalance) {
                const balance = data.referralBalance || 0;
                userWalletBalance.textContent = `UGX ${balance.toLocaleString()}`;
            }
            if (userBadgesDisplay) {
                const badges = data.badges || [];
                if (badges.length > 0) {
                    userBadgesDisplay.innerHTML = badges.map(badge => 
                        `<span class="badge-item">${badge}</span>`
                    ).join('');
                } else {
                    userBadgesDisplay.innerHTML = `<span style="color:var(--text-secondary); font-style:italic; font-size: 0.9em;">Refer friends to earn badges!</span>`;
                }
            }
            if (referralCountStat) {
                const count = data.referralCount || 0;
                referralCountStat.textContent = `${count} Approved`;
            }

            // 3. Check for admin status
            if (data.role === 'admin') {
                checkAdminStatus();
            }

            // 4. Auto-patch old users who are missing a referral code
            if (!data.referralCode) {
                console.log(`Patching user ${user.uid}: adding referralCode.`);
                const newCode = user.uid.substring(0, 6).toUpperCase();
                updateDoc(userDocRef, { 
                    referralCode: newCode 
                }).catch(err => {
                    console.error("Failed to auto-patch referral code:", err);
                });
            }

            // 5. Show welcome modal if needed
            // This will trigger for new users because signup.js
            // sets 'hasSeenWelcomeModal: false'
            if (!data.hasSeenWelcomeModal) {
                newUserNotification.style.display = 'flex';
                content.style.pointerEvents = 'none';
            }
            
            // 6. Show the page
            loader.style.display = 'none';
            content.style.display = 'block';

        } else {
            // This case now means the signup.js hasn't finished.
            // We just show the loader and wait. onSnapshot will
            // fire again as soon as the doc is created.
            console.log("Waiting for user document to be created...");
            loader.style.display = 'block';
            content.style.display = 'none';
        }
    }, (error) => {
        console.error("Error in dashboard snapshot listener:", error);
        loader.innerHTML = "<p style='text-align:center;color:red;'>A database error occurred. Please refresh.</p>";
    });
    // --- *** END OF FIX *** ---


    // Handle Okay button click for the welcome modal
    notificationOkBtn.addEventListener('click', async () => {
        newUserNotification.style.display = 'none';
        content.style.pointerEvents = 'auto';
        try {
            await updateDoc(userDocRef, { hasSeenWelcomeModal: true });
        } catch (err) {
            console.error("Failed to update modal status:", err);
        }
    });
}

// Handle logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });
}