// referrals.js
import { auth, db } from '../js/auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
  doc, getDoc, query, collection, where, getDocs, updateDoc, orderBy, limit
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage } from '../js/shared.js';

// DOM refs
const loader = document.getElementById('referral-loader');
const content = document.getElementById('referral-content');
const userReferralLinkEl = document.getElementById('user-referral-link');
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

let referralChartInstance = null;

// Configuration: reward target (change as you wish)
const REWARD_TARGET = 5; // e.g., 5 referrals -> a reward

// Helper: safe date formatting
function formatDate(d) {
  return d.toLocaleDateString();
}

// Copy link button
copyReferralLinkBtn.addEventListener('click', async () => {
  if (!userReferralLinkEl.value || userReferralLinkEl.value.includes('Loading')) return;
  try {
    await navigator.clipboard.writeText(userReferralLinkEl.value);
    const original = copyReferralLinkBtn.innerHTML;
    copyReferralLinkBtn.innerHTML = 'Copied!';
    setTimeout(() => copyReferralLinkBtn.innerHTML = original, 1500);
  } catch (err) {
    console.error('Copy failed', err);
    showMessage(null, 'Could not copy link to clipboard.', true);
  }
});

// Sharing functions
function shareWhatsApp(link, name = '') {
  const msg = `${name ? name + ' recommends ' : ''}KabaleOnline — find shop items, hostels & gigs. Join with this link: ${link}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}
function shareFacebook(link) {
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
  window.open(url, '_blank', 'noopener');
}
function shareSMS(link, name='') {
  const body = `${name ? name + ' recommends ' : ''}Join KabaleOnline: ${link}`;
  // sms: format works on mobile (some desktop clients may not)
  window.open(`sms:?&body=${encodeURIComponent(body)}`, '_self');
}

shareWaBtn && shareWaBtn.addEventListener('click', () => shareWhatsApp(userReferralLinkEl.value));
shareFbBtn && shareFbBtn.addEventListener('click', () => shareFacebook(userReferralLinkEl.value));
shareSmsBtn && shareSmsBtn.addEventListener('click', () => shareSMS(userReferralLinkEl.value));

// Main auth + data load
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // not signed in - redirect to login or show message
    loader.style.display = 'none';
    showMessage(null, 'Please sign in to view your referrals.', true);
    return;
  }

  try {
    // load current user's document
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) throw new Error('User profile not found.');

    const userData = userSnap.data();

    // referralCode fallback - try referralCode then uid slice (keeps compatibility)
    const referralCode = userData.referralCode || (user.uid.slice(0,6).toUpperCase());

    // Display referral link
    userReferralLinkEl.value = `${window.location.origin}/signup/?ref=${encodeURIComponent(referralCode)}`;

    // Query users where referrerId == current user UID
    const referralsQuery = query(collection(db, 'users'), where('referrerId', '==', user.uid));
    const referralsSnap = await getDocs(referralsQuery);

    // counts & UI updates
    const totalReferrals = referralsSnap.size;
    referralCountEl.textContent = totalReferrals;
    userReferralCountEl.textContent = totalReferrals;

    // Fill referral list
    referralListEl.innerHTML = '';
    const referralDates = []; // for chart
    if (referralsSnap.empty) {
      referralListEl.innerHTML = '<li style="color:var(--text-secondary)">No referrals yet. Share your link to get started!</li>';
    } else {
      referralsSnap.forEach(docSnap => {
        const d = docSnap.data();
        const li = document.createElement('li');
        const name = d.name || d.fullName || d.email || docSnap.id;
        li.innerHTML = `<span>${name}</span><small style="color:var(--text-secondary)">${d.createdAt ? formatDate(new Date(d.createdAt.seconds * 1000)) : ''}</small>`;
        referralListEl.appendChild(li);

        if (d.createdAt) {
          referralDates.push(new Date(d.createdAt.seconds * 1000));
        }
      });
    }

    // Update backing referralCount field if different
    if ((userData.referralCount || 0) !== totalReferrals) {
      try { await updateDoc(userDocRef, { referralCount: totalReferrals }); } catch(e) { /* non-fatal */ }
    }

    // Monthly referrals (simple calc)
    const thisMonth = new Date();
    const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
    let monthCount = 0;
    referralsSnap.forEach(s => {
      const d = s.data();
      if (d.createdAt) {
        const date = new Date(d.createdAt.seconds * 1000);
        if (date >= monthStart) monthCount++;
      }
    });
    monthReferralsEl.textContent = monthCount;

    // Progress to next reward
    const progress = Math.min(1, totalReferrals / REWARD_TARGET);
    progressFillEl.style.width = `${Math.floor(progress * 100)}%`;
    progressFillEl.textContent = `${totalReferrals}/${REWARD_TARGET}`;
    if (progress > 0.6) progressFillEl.style.background = 'linear-gradient(90deg,#28a745,#0ea5a0)';

    // Leaderboard (top 5 by referralCount) - requires a 'referralCount' field on user docs
    // NOTE: ensure your user documents have referralCount numbers; otherwise leaderboard will be empty.
    try {
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
          item.innerHTML = `<div style="font-weight:700">#${rank} ${u.name || u.email || uSnap.id}</div><div style="font-weight:800">${u.referralCount || 0}</div>`;
          leaderboardEl.appendChild(item);
          if (uSnap.id === user.uid) yourRankEl.textContent = `#${rank}`;
          rank++;
        });
        if (yourRankEl.textContent === '#--') yourRankEl.textContent = '—';
      }
    } catch(lbErr) {
      console.warn('Leaderboard fetch failed', lbErr);
      leaderboardEl.innerHTML = '<div style="color:var(--text-secondary)">Leaderboard unavailable.</div>';
    }

    // Build chart data from referralDates
    if (referralDates.length) {
      // convert dates to labels by day
      const counts = {};
      referralDates.forEach(d => {
        const key = d.toISOString().slice(0,10);
        counts[key] = (counts[key] || 0) + 1;
      });
      const labels = Object.keys(counts).sort();
      const data = labels.map(l => counts[l]);

      // Destroy previous chart if present
      if (referralChartInstance) referralChartInstance.destroy();
      const ctx = chartCanvas.getContext('2d');
      referralChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels.map(l => (new Date(l)).toLocaleDateString()),
          datasets: [{
            label: 'Referrals',
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
          plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            x: { title: { display: true, text: 'Date' } },
            y: { title: { display: true, text: 'Number of Referrals' }, beginAtZero: true, precision:0 }
          }
        }
      });
    } else {
      // no data
      if (chartCanvas) {
        const ctx = chartCanvas.getContext('2d');
        if (referralChartInstance) referralChartInstance.destroy();
        ctx.clearRect(0,0,chartCanvas.width, chartCanvas.height);
        // simple placeholder text
        ctx.font = "14px Arial";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("No referral activity to display", 10, 30);
      }
    }

  } catch (err) {
    console.error("Error loading referral data:", err);
    showMessage(null, 'Failed to load referral data. Check console for details.', true);
    referralListEl.innerHTML = '<li style="color:var(--text-secondary)">Could not load referrals.</li>';
  } finally {
    loader.style.display = 'none';
    content.style.display = 'block';
  }
});