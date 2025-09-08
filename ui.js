// Your existing hamburger menu code
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');
    const overlay = document.querySelector('.mobile-nav-overlay');

    if (hamburger && mobileNav && overlay) {
        // Function to open the menu
        const openMenu = () => {
            mobileNav.classList.add('active');
            overlay.classList.add('active');
        };

        // Function to close the menu
        const closeMenu = () => {
            mobileNav.classList.remove('active');
            overlay.classList.remove('active');
        };

        // Event listener for the hamburger icon
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation(); 
            openMenu();
        });

        // Event listener for the overlay
        overlay.addEventListener('click', closeMenu);

        // Optional: Close menu with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
                closeMenu();
            }
        });
    }
});

// --- ADD THE PWA CODE BELOW THIS LINE ---

// Register the Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('✅ ServiceWorker registration successful!');
      })
      .catch(err => {
        console.log('❌ ServiceWorker registration failed: ', err);
      });
  });
}

// --- PWA Install Banner Code ---
let deferredPrompt;
const banner = document.getElementById('pwa-banner');
const installBtn = document.getElementById('pwa-install-btn');
const cancelBtn = document.getElementById('pwa-cancel-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  if (banner) {
    banner.style.display = 'block';
    setTimeout(() => {
      banner.style.bottom = '0'; // slide in
    }, 50);
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (banner) banner.style.bottom = '-120px';
    setTimeout(() => {
      if (banner) banner.style.display = 'none';
    }, 500);

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
    if (banner) banner.style.bottom = '-120px';
    setTimeout(() => {
      if (banner) banner.style.display = 'none';
    }, 500);
  });
}

window.addEventListener('appinstalled', () => {
  if (banner) {
    banner.style.bottom = '-120px';
    setTimeout(() => {
      if (banner) banner.style.display = 'none';
    }, 500);
  }
  console.log('PWA was installed 🎉');
});