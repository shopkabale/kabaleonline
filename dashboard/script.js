import { auth, db } from '../js/auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot, 
    query, collection, where, getDocs, limit 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM elements
const newUserNotification = document.getElementById('new-user-notification');
const notificationOkBtn = document.getElementById('notification-ok-btn');
const content = document.getElementById('dashboard-content');
const loader = document.getElementById('dashboard-loader');
const userProfilePhoto = document.getElementById('user-profile-photo');
const userDisplayName = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('logout-btn');

// --- NEW GAMIFICATION DOM ELEMENTS ---
const adminNotificationBanner = document.getElementById('admin-notification-banner');
const promoBannerEl = document.getElementById('promo-banner');
const userWalletBalance = document.getElementById('user-wallet-balance');
const userBadgesDisplay = document.getElementById('user-badges-display');
const referralCountStat = document.getElementById('referral-count-stat');

let userDocRef = null;

// --- NEW: Function to check for promos ---
// Runs once for every user
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

// --- NEW: Function to check for admin tasks ---
// Runs only if the user is an admin
async function checkAdminStatus(userData) {
    if (userData.role === 'admin') {
        try {
            // Query for just ONE pending referral to see if the queue is empty
            const q = query(
                collection(db, 'referral_log'), 
                where('status', '==', 'pending'), 
                limit(1)
            );
            const pendingSnap = await getDocs(q);
            
            if (!pendingSnap.empty) {
                // If there are pending items, show the banner
                if (adminNotificationBanner) {
                    adminNotificationBanner.style.display = 'block';
                }
            }
        } catch (err) {
            console.warn("Admin check for pending referrals failed:", err);
        }
    }
}


// Monitor auth state
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userDocRef = doc(db, 'users', user.uid);
        await initializeDashboard(user);
        
        // --- NEW: Check for promos on page load ---
        displayActivePromo(); 
    } else {
        window.location.href = "/login/";
    }
});

// Initialize dashboard
async function initializeDashboard(user) {
    try {
        // Check if user document exists
        let userDoc = await getDoc(userDocRef);
        let isNewUser = false;

        if (!userDoc.exists()) {
            // Create new user document
            const newUserProfile = {
                email: user.email,
                fullName: 'New User',
                role: 'seller', // Your default role
                isSeller: true, // From your DB screenshot
                createdAt: serverTimestamp(),
                referralCode: user.uid.substring(0, 6).toUpperCase(),
                referralCount: 0,
                referralBalance: 0, // Use 'referralBalance' from your DB
                badges: [],
                hasSeenWelcomeModal: false,
                photoURL: null
            };
            await setDoc(userDocRef, newUserProfile);
            isNewUser = true;
        } else {
            const userDataCheck = userDoc.data();
            if (!userDataCheck.fullName || userDataCheck.fullName === 'New User') {
                isNewUser = true;
            }
        }

        // Listen to changes in user document in real-time
        onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // Update basic profile info
                userProfilePhoto.src = data.photoURL || data.profilePhotoUrl || 'https://placehold.co/100x100/e0e0e0/777?text=U';
                userDisplayName.textContent = data.fullName || data.name || 'Valued Seller';

                // --- NEW: Update Gamification Module ---
                
                // 1. Update Wallet
                if (userWalletBalance) {
                    const balance = data.referralBalance || 0;
                    userWalletBalance.textContent = `UGX ${balance.toLocaleString()}`;
                }

                // 2. Update Badges
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

                // 3. Update Referral Card Stat
                if (referralCountStat) {
                    const count = data.referralCount || 0;
                    referralCountStat.textContent = `${count} Approved`;
                }

                // 4. Check for Admin role & Pending Referrals
                checkAdminStatus(data);

                // --- End of New Logic ---

                // Show welcome modal if needed (Your original logic)
                if (isNewUser && !data.hasSeenWelcomeModal) {
                    newUserNotification.style.display = 'flex';
                    content.style.pointerEvents = 'none';
                }
            }
        });

        // Hide loader and show dashboard content
        loader.style.display = 'none';
        content.style.display = 'block';

        // Handle Okay button click
        notificationOkBtn.addEventListener('click', async () => {
            newUserNotification.style.display = 'none';
            content.style.pointerEvents = 'auto';
            try {
                await updateDoc(userDocRef, { hasSeenWelcomeModal: true });
            } catch (err) {
                console.error("Failed to update modal status:", err);
            }
        });

    } catch (error) {
        console.error("Error initializing dashboard:", error);
        loader.innerHTML = "<p style='text-align:center;color:red;'>Failed to load dashboard. Please refresh.</p>";
    }
}

// Handle logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });
}