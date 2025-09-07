// ui.js
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');

    // Safety check to make sure the elements exist
    if (hamburger && mobileNav) {
        hamburger.addEventListener('click', () => {
            // This toggles the .active class on the menu to show/hide it
            mobileNav.classList.toggle('active');
        });
    }
});
