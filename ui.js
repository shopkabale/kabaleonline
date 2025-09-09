// ==================== IMPORTS ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

// ==================== CONFIG ====================
const firebaseConfig = {
  // your Firebase config here
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ==================== HELPER ====================
function isOneWeekPassed(lastTime) {
  if (!lastTime) return true;
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
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

    hamburger.addEventListener('click', e => {
      e.stopPropagation();
      openMenu();
    });
    overlay.addEventListener('click', closeMenu);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
        closeMenu();
      }
    });
  }
});

// ==================== PWA INSTALL ====================
let deferredPrompt;
const banner = document.getElementById('pwa-banner');
const installBtn = document.getElementById('pwa-install-btn');
const cancelBtn = document.getElementById('pwa-cancel-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const lastSeen = localStorage.getItem('lastPwaPrompt');
  if (isOneWeekPassed(lastSeen)) {
    setTimeout(() => {
      if (banner) {
        banner.style.display = 'block';
        banner.animate([{ bottom: '-120px' }, { bottom: '0px' }], { duration: 500, fill: 'forwards' });
        localStorage.setItem('lastPwaPrompt', Date.now().toString());
      }
    }, 15000); // 15s delay
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (banner) {
      banner.animate([{ bottom: '0px' }, { bottom: '-120px' }], { duration: 500, fill: 'forwards' })
        .onfinish = () => (banner.style.display = 'none');
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
      banner.animate([{ bottom: '0px' }, { bottom: '-120px' }], { duration: 500, fill: 'forwards' })
        .onfinish = () => (banner.style.display = 'none');
    }
  });
}

window.addEventListener('appinstalled', () => {
  if (banner) {
    banner.animate([{ bottom: '0px' }, { bottom: '-120px' }], { duration: 500, fill: 'forwards' })
      .onfinish = () => (banner.style.display = 'none');
  }
  localStorage.removeItem('lastPwaPrompt');
  console.log('PWA installed 🎉');
});

// ==================== LOGIN PROMPT ====================
document.addEventListener('DOMContentLoaded', () => {
  const prompt = document.getElementById('loginPrompt');
  const cancelLoginBtn = document.getElementById('loginPromptCancel');

  if (!prompt) return;

  function showLoginPrompt() {
    prompt.style.display = 'flex';
    prompt.animate([{ opacity: 0, transform: 'scale(0.8)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 300, fill: 'forwards' });

    // Auto-remove after 4s
    setTimeout(() => {
      if (prompt) prompt.remove();
    }, 4000);

    // Remove if clicked outside
    prompt.addEventListener('click', e => {
      if (e.target === prompt) prompt.remove();
    });

    // Cancel button
    if (cancelLoginBtn) {
      cancelLoginBtn.addEventListener('click', () => {
        prompt.remove();
      });
    }

    // Save timestamp for weekly repeat
    localStorage.setItem('lastLoginPrompt', Date.now().toString());

    // Floating corner button if ignored
    createFloatingLoginButton();
  }

  const lastSeen = localStorage.getItem('lastLoginPrompt');

  onAuthStateChanged(auth, (user) => {
    if (!user && isOneWeekPassed(lastSeen)) {
      setTimeout(showLoginPrompt, 25000); // 25s delay
    } else if (user) {
      prompt.remove();
    }
  });
});

// ==================== FLOATING LOGIN BUTTON ====================
function createFloatingLoginButton() {
  if (document.getElementById('floatingLoginBtn')) return;
  const btn = document.createElement('a');
  btn.href = '/sell/';
  btn.id = 'floatingLoginBtn';
  btn.textContent = 'Login / Sign Up';
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '12px 18px',
    background: '#007bff',
    color: '#fff',
    borderRadius: '8px',
    zIndex: 9999,
    textDecoration: 'none',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    animation: 'floatIn 0.5s ease-out'
  });
  document.body.appendChild(btn);

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.1)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
  });

  // Animation keyframes
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes floatIn { from {opacity:0; transform: translateY(50px);} to {opacity:1; transform: translateY(0);} }
  `;
  document.head.appendChild(style);
}

// ==================== SERVICE WORKER ====================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('✅ ServiceWorker registered'))
      .catch(err => console.log('❌ ServiceWorker failed: ', err));
  });
}