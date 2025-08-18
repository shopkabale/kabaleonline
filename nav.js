// nav.js
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger-menu');
    const navMenu = document.querySelector('.header-nav');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('is-active');
        });
    }
});
