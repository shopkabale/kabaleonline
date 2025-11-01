document.addEventListener('DOMContentLoaded', () => {

    // --- MOBILE MENU LOGIC ---
    const hamburger = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');
    const overlay = document.querySelector('.mobile-nav-overlay');

    if (hamburger && mobileNav && overlay) {
        hamburger.addEventListener('click', () => {
            mobileNav.classList.toggle('active');
            overlay.classList.toggle('active');
        });
        
        overlay.addEventListener('click', () => {
            mobileNav.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // --- DROPPING WORD ANIMATION ---
    const wordElement = document.getElementById('dropping-word');
    const words = [
        "phones", 
        "shoes", 
        "food", 
        "rentals", 
        "laptops", 
        "textbooks", 
        "anything"
    ];
    let index = 0;

    if (wordElement) {
        setInterval(() => {
            index = (index + 1) % words.length;
            wordElement.textContent = words[index];
            
            // Re-trigger the animation
            wordElement.classList.remove('word');
            void wordElement.offsetWidth; 
            wordElement.classList.add('word');
            
        }, 2000); // 2 seconds
        
        // Start the first animation immediately
        wordElement.classList.add('word');
    }

});