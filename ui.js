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
            e.stopPropagation(); // Prevents the click from bubbling up to the document
            openMenu();
        });

        // Event listener for the overlay (to close menu when clicking outside)
        overlay.addEventListener('click', closeMenu);

        // Optional: Close menu if user presses the Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
                closeMenu();
            }
        });
    }
});