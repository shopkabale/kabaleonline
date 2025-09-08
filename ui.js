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
