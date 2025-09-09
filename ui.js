// ==================== HELPER FUNCTION ====================
function isOneWeekPassed(lastTime) {
  if (!lastTime) return true;
  const oneWeek = 7 * 24 * 60 * 60 * 1000; // ms
  return (Date.now() - parseInt(lastTime, 10)) > oneWeek;
}

// ==================== HAMBURGER MENU ====================
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger-menu');
  const mobileNav = document.querySelector('.mobile-nav');
  const overlay = document.querySelector('.mobile-nav-overlay');

  if (hamburger && mobileNav && overlay) {
    const openMenu = () => {
      mobileNav.classList.add('active');
      overlay.classList.add('active');
    };
    const closeMenu = () => {
      mobileNav.classList.remove('active');
      overlay.classList.remove('active');
    };

    hamburger.addEventListener('click', (e) => {
      e.stopPropagation(); 
      openMenu();
    });

    overlay.addEventListener('click', closeMenu);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
        closeMenu();
      }
    });
  }
});

// ==================== PWA SERVICE WORKER ====================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('✅ ServiceWorker registered'))
      .catch(err => console.log('❌ ServiceWorker failed: ', err));
  });
}

// ==================== PWA INSTALL BANNER ====================
let deferredPrompt;
const banner = document.getElementById('pwa-banner');
const installBtn = document.getElementById('pwa-install-btn');
const cancelBtn = document.getElementById('pwa-cancel-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const lastSeen = localStorage.getItem("lastPwaPrompt");
  if (isOneWeekPassed(lastSeen)) {
    // Show banner after 15s
    setTimeout(() => {
      if (banner) {
        banner.style.display = 'block';
        setTimeout(() => { banner.style.bottom = '0'; }, 50);
        localStorage.setItem("lastPwaPrompt", Date.now().toString());
      }
    }, 15000);
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (banner) {
      banner.style.bottom = '-120px';
      setTimeout(() => (banner.style.display = 'none'), 500);
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(outcome === 'accepted' ? 'User accepted install ✅' : 'User dismissed install ❌');
      deferredPrompt = null;
    }
  });
}

if (cancelBtn) {
  cancelBtn.addEventListener('click', () => {
    if (banner) {
      banner.style.bottom = '-120px';
      setTimeout(() => (banner.style.display = 'none'), 500);
    }
  });
}

window.addEventListener('appinstalled', () => {
  if (banner) {
    banner.style.bottom = '-120px';
    setTimeout(() => (banner.style.display = 'none'), 500);
  }
  console.log('PWA installed 🎉');
  localStorage.removeItem("lastPwaPrompt");
});

// ==================== LOGIN PROMPT (ONLY FOR NOT LOGGED-IN USERS) ====================
document.addEventListener("DOMContentLoaded", () => {
  const prompt = document.getElementById("loginPrompt");
  const cancelLoginBtn = document.getElementById("loginPromptCancel");

  if (!prompt) return;

  // Check Firebase Auth (replace with your auth method if different)
  if (firebase && firebase.auth) {
    firebase.auth().onAuthStateChanged(user => {
      if (!user) {
        // User not logged in → show prompt if week passed
        const lastSeen = localStorage.getItem("lastLoginPrompt");
        if (isOneWeekPassed(lastSeen)) {
          setTimeout(() => {
            prompt.style.display = "flex";

            // Auto-remove after 4s
            setTimeout(() => { if (prompt) prompt.remove(); }, 4000);

            // Remove if user clicks outside
            prompt.addEventListener("click", (e) => {
              if (e.target === prompt) prompt.remove();
            });

            // Cancel button
            if (cancelLoginBtn) {
              cancelLoginBtn.addEventListener("click", () => {
                prompt.remove();
              });
            }

            // Save timestamp
            localStorage.setItem("lastLoginPrompt", Date.now().toString());
          }, 25000); // 25s delay
        }
      } else {
        // Logged-in user → remove prompt immediately if exists
        prompt.remove();
      }
    });
  } else {
    console.warn("Firebase Auth not found. Login prompt will show anyway.");
    // fallback: show anyway
    const lastSeen = localStorage.getItem("lastLoginPrompt");
    if (isOneWeekPassed(lastSeen)) {
      setTimeout(() => {
        prompt.style.display = "flex";
        setTimeout(() => { if (prompt) prompt.remove(); }, 4000);
        if (cancelLoginBtn) cancelLoginBtn.addEventListener("click", () => { prompt.remove(); });
        localStorage.setItem("lastLoginPrompt", Date.now().toString());
      }, 25000);
    }
  }
});