import { auth, db } from '../js/auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
  doc, getDoc, query, collection, where, getDocs, orderBy, limit, Timestamp
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage } from '../js/shared.js';

// --- DOM refs ---
const loader = document.getElementById('referral-loader');
const content = document.getElementById('referral-content');
const userReferralLinkEl = document.getElementById('user-referral-link');
// ... (all other DOM refs are correct) ...
const copyReferralLinkBtn = document.getElementById('copy-referral-link-btn');
const referralListEl = document.getElementById('referral-list');
const referralCountEl = document.getElementById('referral-count'); 
const userReferralCountEl = document.getElementById('user-referral-count'); 
const monthReferralsEl = document.getElementById('month-referrals');
const progressFillEl = document.getElementById('progressFill');
const yourRankEl = document.getElementById('your-rank');
const leaderboardEl = document.getElementById('leaderboard');
const chartCanvas = document.getElementById('referralChart');
const shareWaBtn = document.getElementById('share-wa');
const shareFbBtn = document.getElementById('share-fb');
const shareSmsBtn = document.getElementById('share-sms');
const promoBannerEl = document.getElementById('promo-banner'); 
const userBalanceEl = document.getElementById('user-balance'); 
const userBadgesEl = document.getElementById('user-badges'); 

let referralChartInstance = null;
const REWARD_TARGET = 5; 

// --- Helper: safe date formatting ---
function formatDate(d) {
  if (!d || !d.toLocaleDateString) {
      return 'Someday';
  }
  return d.toLocaleDateString();
}

// --- Copy link button ---
copyReferralLinkBtn.addEventListener('click', async () => {
  if (!userReferralLinkEl.value || userReferralLinkEl.value.includes('Loading')) return;
  try {
    userReferralLinkEl.select();
    document.execCommand('copy'); 
    const original = copyReferralLinkBtn.innerHTML;
    copyReferralLinkBtn.innerHTML = 'Copied!';
    setTimeout(() => copyReferralLinkBtn.innerHTML = original, 1500);
  } catch (err) {
    console.error('Copy failed', err);
    showMessage(null, 'Could not copy link to clipboard.', true);
  }
});

// --- Sharing functions ---
function shareWhatsApp(link, name = '') { /* ... (no changes) ... */ }
function shareFacebook(link) { /* ... (no changes) ... */ }
function shareSMS(link, name='') { /* ... (no changes) ... */ }

shareWaBtn && shareWaBtn.addEventListener('click', () => shareWhatsApp(userReferralLinkEl.value));
shareFbBtn && shareFbBtn.addEventListener('click', () => shareFacebook(userReferralLinkEl.value));
shareSmsBtn && shareSmsBtn.addEventListener('click', () => shareSMS(userReferralLinkEl.value));

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
          promoBannerEl.innerHTML = `
            <div style="background:var(--ko-primary); color:white; padding:12px; border-radius:8px; text-align:center; font-weight:700; margin-bottom:16px;">
              ${promo.message || 'Special promotion active!'}
            </div>
          `;
          promoBannerEl.style.display = 'block';
        }
      }
    }
  } catch (err) {
    console.warn("Could not display promo", err);
  }
}

// --- Main auth + data load ---
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    loader.style.display = 'none';
    showMessage(null, 'Please sign in to view your referrals.', true);
    return;
  }

  displayActivePromo();

  try {
    // 1. --- Load current user's document ---
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) throw new Error('User profile not found.');

    const userData = userSnap.data();

    // 2. --- Display Referral Link ---
    const referralCode = userData.referralCode || (user.uid.slice(0,6).toUpperCase());
    userReferralLinkEl.value = `${window.location.origin}/signup/?ref=${encodeURIComponent(referralCode)}`;

    // 3. --- Populate Wallet & Badges ---
    if (userBalanceEl) {
      const balance = userData.referralBalance || 0;
      userBalanceEl.textContent = `UGX ${balance.toLocaleString()}`;
    }
    if (userBadgesEl) {
      const badges = userData.badges || [];
      if (badges.length > 0) {
        userBadgesEl.innerHTML = badges.map(badge => 
          `<span style="background:#e9ecef; color:#495057; padding:4px 8px; border-radius:12px; font-size:0.85em; font-weight:700;">${badge}</span>`
        ).join(' ');
      } else {
        userBadgesEl.innerHTML = `<span style="color:var(--text-secondary); font-style:italic;">No badges yet. Keep going!</span>`;
      }
    }

    // 4. --- Query 'referral_log' to build status list ---
    //
    //  !!!!!!!!!!   IMPORTANT   !!!!!!!!!!
    //  This query will FAIL unless you create the Firestore Index.
    //  Go to your Firestore "Indexes" tab and create this:
    //  Collection: 'referral_log'
    //  Field 1: 'referrerId' (Ascending)
    //  Field 2: 'createdAt' (Descending)
    //
    const logQuery = query(collection(db, 'referral_log'), where('referrerId', '==', user.uid), orderBy('createdAt', 'desc'));
    const logSnap = await getDocs(logQuery);

    const totalSignups = logSnap.size; 
    const approvedCount = userData.referralCount || 0; 

    referralCountEl.textContent = totalSignups; 
    userReferralCountEl.textContent = approvedCount; 

    // 5. --- Fill referral list with statuses ---
    referralListEl.innerHTML = '';
    const referralDates = []; 
    if (logSnap.empty) {
      referralListEl.innerHTML = '<li style="color:var(--text-secondary)">No referrals yet. Share your link to get started!</li>';
    } else {
      logSnap.forEach(docSnap => {
        const d = docSnap.data();
        const li = document.createElement('li');
        const name = d.referredUserName || 'New User';

        // This status logic is still good.
        // It will show 'Pending' if the function is slow or failed.
        // It will show 'Approved' when the function succeeds.
        let statusBadge = '';
        if (d.status === 'pending') {
          statusBadge = '<span style="color:#ffc107; font-weight:700;">Pending</span>';
        } else if (d.status === 'approved') {
          statusBadge = '<span style="color:#28a745; font-weight:700;">Approved</span>';
        } else if (d.status === 'rejected') {
           statusBadge = '<span style="color:#dc3545; font-weight:700;">Rejected</span>';
        }

        const date = d.createdAt ? formatDate(new Date(d.createdAt.seconds * 1000)) : '';
        li.innerHTML = `<span>${name}</span> <div style="text-align:right;"><small style="color:var(--text-secondary); display:block; margin-bottom:2px;">${date}</small> ${statusBadge}</div>`;
        referralListEl.appendChild(li);

        if (d.createdAt && d.status === 'approved') { 
          referralDates.push(new Date(d.createdAt.seconds * 1000));
        }
      });
    }

    // 6. --- Monthly referrals (total signups) ---
    const thisMonth = new Date();
    const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
    let monthCount = 0;
    logSnap.forEach(s => {
      const d = s.data();
      if (d.createdAt) {
        const date = new Date(d.createdAt.seconds * 1000);
        if (date >= monthStart) monthCount++;
      }
    });
    monthReferralsEl.textContent = monthCount;

    // 7. --- Progress to next reward (uses APPROVED count) ---
    const progress = Math.min(1, approvedCount / REWARD_TARGET);
    progressFillEl.style.width = `${Math.floor(progress * 100)}%`;
    progressFillEl.textContent = `${approvedCount}/${REWARD_TARGET}`;
    if (progress > 0.6) progressFillEl.style.background = 'linear-gradient(90deg,#28a745,#0ea5a0)';

    // 8. --- Leaderboard (uses 'referralCount' field) ---
    try {
      // This query ALSO requires an index.
      // Collection: 'users'
      // Field: 'referralCount' (Descending)
      const lbQuery = query(collection(db, 'users'), orderBy('referralCount', 'desc'), limit(5));
      const lbSnap = await getDocs(lbQuery);
      leaderboardEl.innerHTML = '';
      if (lbSnap.empty) {
        leaderboardEl.innerHTML = '<div style="color:var(--text-secondary)">No leaderboard data yet.</div>';
      } else {
        let rank = 1;
        lbSnap.forEach(uSnap => {
          const u = uSnap.data();
          const item = document.createElement('div');
          item.className = 'leaderboard-item';
          const name = u.fullName || u.name || u.email || uSnap.id;
          item.innerHTML = `<div style="font-weight:700">#${rank} ${name}</div><div style="font-weight:800">${u.referralCount || 0}</div>`;
          leaderboardEl.appendChild(item);
          if (uSnap.id === user.uid) yourRankEl.textContent = `#${rank}`;
          rank++;
        });
        if (yourRankEl.textContent === '#--') yourRankEl.textContent = '—';
      }
    } catch(lbErr) {
      console.warn('Leaderboard fetch failed (Do you need a Firestore Index?)', lbErr);
      leaderboardEl.innerHTML = '<div style="color:var(--text-secondary)">Leaderboard unavailable.</div>';
    }

    // 9. --- Build chart data (from APPROVED referrals) ---
    if (referralDates.length) {
      // ... (chart logic is correct) ...
      const counts = {};
      referralDates.forEach(d => {
        const key = d.toISOString().slice(0,10);
        counts[key] = (counts[key] || 0) + 1;
      });
      const labels = Object.keys(counts).sort();
      const data = labels.map(l => counts[l]);

      if (referralChartInstance) referralChartInstance.destroy();
      const ctx = chartCanvas.getContext('2d');
      referralChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels.map(l => (new Date(l)).toLocaleDateString()),
          datasets: [{
            label: 'Approved Referrals',
            data: data,
            fill: false,
            borderColor: '#28a745',
            tension: 0.3,
            pointBackgroundColor: '#28a745',
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
          scales: {
            x: { title: { display: false, text: 'Date' } },
            y: { title: { display: false, text: 'Referrals' }, beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });
    } else {
      // ... (no data logic is correct) ...
      if (chartCanvas) {
        const ctx = chartCanvas.getContext('2d');
        if (referralChartInstance) referralChartInstance.destroy();
        ctx.clearRect(0,0,chartCanvas.width, chartCanvas.height);
        ctx.font = "14px Arial";
        ctx.fillStyle = "var(--text-secondary, #94a3b8)";
        ctx.textAlign = "center";
        ctx.fillText("No approved referral activity yet", chartCanvas.width / 2, 50);
      }
    }

  } catch (err) {
    console.error("Error loading referral data:", err);
    // This is where you will see the "Missing Index" error
    showMessage(null, 'Failed to load referral data. Check console for details.', true);
    referralListEl.innerHTML = '<li style="color:var(--text-secondary)">Could not load referrals.</li>';
  } finally {
    loader.style.display = 'none';
    content.style.display = 'block';
  }
});