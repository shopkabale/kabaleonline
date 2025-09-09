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

// ==================== PWA INSTALL TEST ====================
let deferredPrompt;
const banner = document.getElementById('pwa-banner');
const installBtn = document.getElementById('pwa-install-btn');
const cancelBtn = document.getElementById('pwa-cancel-btn');

// For testing, show banner 5s after page load
window.addEventListener('load', () => {
  setTimeout(() => {
    if (banner) {
      banner.style.display = 'block';
      banner.animate([{ bottom: '-120px' }, { bottom: '0px' }], { duration: 500, fill: 'forwards' });
    }
  }, 5000); // 5 seconds
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

// ==================== LOGIN PROMPT TEST ====================
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

    // Floating corner button
    createFloatingLoginButton();
  }

  // TEST: show login prompt 10s after page load
  setTimeout(showLoginPrompt, 10000);
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

  btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.1)'; });
  btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });

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