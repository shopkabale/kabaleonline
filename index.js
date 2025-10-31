// Import Firebase functions at the top of the module
import { db } from './firebase.js'; // Ensure you have firebase.js configured
import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// ==================================================== //
//               DYNAMIC DATA FETCHING                  //
// ==================================================== //

/**
 * Generates a Cloudinary URL with specified transformations.
 * @param {string} url The original Cloudinary URL.
 * @returns {string} The transformed URL or a placeholder.
 */
function getCloudinaryTransformedUrl(url) {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || 'https://placehold.co/400x400/e0e0e0/777?text=No+Image';
    }
    const transformString = 'c_fill,g_auto,w_400,h_400,f_auto,q_auto';
    const urlParts = url.split('/upload/');
    return urlParts.length === 2 ? `${urlParts[0]}/upload/${transformString}/${urlParts[1]}` : url;
}

/** Fetches and displays trending products from Firestore. */
async function fetchTrendingProducts() {
    const trendingGrid = document.getElementById('trending-products-grid');
    if (!trendingGrid) return;

    try {
        const q = query(collection(db, 'products'), where('isHero', '==', true), where('isSold', '==', false), orderBy('heroTimestamp', 'desc'), limit(8));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            trendingGrid.innerHTML = '<p style="padding: 0 15px;">No trending products found.</p>';
            return;
        }

        trendingGrid.innerHTML = "";
        const fragment = document.createDocumentFragment();
        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            const productCard = document.createElement('a');
            productCard.href = `/product.html?id=${product.id}`;
            productCard.className = "product-card";
            productCard.innerHTML = `
                <img src="${getCloudinaryTransformedUrl(product.imageUrls?.[0])}" alt="${product.name}" loading="lazy">
                <div class="product-card-content">
                    <h3>${product.name}</h3>
                    <p class="price">UGX ${product.price ? product.price.toLocaleString() : "N/A"}</p>
                </div>`;
            fragment.appendChild(productCard);
        });
        trendingGrid.appendChild(fragment);

    } catch (error) {
        console.error("Error fetching trending products:", error);
        trendingGrid.innerHTML = '<p style="padding: 0 15px;">Could not load products at this time.</p>';
    }
}

/** Fetches and displays approved testimonials from Firestore. */
async function fetchTestimonials() {
    const testimonialGrid = document.getElementById('testimonial-grid');
    if (!testimonialGrid) return;

    try {
        const q = query(collection(db, 'testimonials'), where('status', '==', 'approved'), orderBy('order', 'asc'), limit(2));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            testimonialGrid.closest('.testimonial-section').style.display = 'none';
            return;
        }

        testimonialGrid.innerHTML = '';
        snapshot.forEach(doc => {
            const testimonial = doc.data();
            const card = document.createElement('div');
            card.className = 'testimonial-card';
            card.innerHTML = `
                <p class="testimonial-text">"${testimonial.quote}"</p>
                <p class="testimonial-author">&ndash; ${testimonial.authorName}</p>`;
            testimonialGrid.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching testimonials:", error);
    }
}


// ==================================================== //
//           WAIT FOR DOM TO BE FULLY LOADED            //
// ==================================================== //

document.addEventListener('DOMContentLoaded', () => {

    // --- INITIALIZE DYNAMIC CONTENT ---
    fetchTrendingProducts();
    fetchTestimonials();

    // ==================================================== //
    //                  UI ANIMATIONS                       //
    // ==================================================== //

    // --- Heading Typing Animation ---
    const typingTextElement = document.getElementById('typing-text');
    if (typingTextElement) {
        const words = ["Shoes", "Electronics", "Clothes", "Laptops", "Text Books", "Smartphones", "Furniture", "anything"];
        let i = 0;
        let j = 0;
        let isDeleting = false;

        function type() {
            const currentWord = words[i];
            const speed = isDeleting ? 100 : 200;

            if (isDeleting) {
                typingTextElement.textContent = currentWord.substring(0, j - 1);
                j--;
                if (j === 0) {
                    isDeleting = false;
                    i = (i + 1) % words.length;
                }
            } else {
                typingTextElement.textContent = currentWord.substring(0, j + 1);
                j++;
                if (j === currentWord.length) {
                    isDeleting = true;
                    setTimeout(type, 2000); // Pause at end of word
                    return;
                }
            }
            setTimeout(type, speed);
        }
        type();
    }
    
    // --- Search Bar Placeholder Animation ---
    const searchBar = document.getElementById('hero-search-input');
    if (searchBar) {
        const placeholders = ["Search for laptops...", "Try 'iPhone X'...", "Find textbooks..."];
        let i = 0, j = 0, isDeleting = false, timeout;
        
        function typePlaceholder() {
            const current = placeholders[i];
            const speed = isDeleting ? 75 : 150;
            searchBar.placeholder = current.substring(0, j);

            if (!isDeleting && j < current.length) { j++; } 
            else if (isDeleting && j > 0) { j--; } 
            else {
                isDeleting = !isDeleting;
                if (!isDeleting) i = (i + 1) % placeholders.length;
                timeout = isDeleting ? 1500 : 500;
            }
            setTimeout(typePlaceholder, timeout || speed);
        }
        typePlaceholder();
    }

    // --- Animated Number Counters ---
    const counters = document.querySelectorAll('.stat-number[data-target]');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = +counter.getAttribute('data-target');
                let count = 0;
                const updateCount = () => {
                    const increment = target / 100;
                    if (count < target) {
                        count += increment;
                        counter.innerText = Math.ceil(count).toLocaleString();
                        setTimeout(updateCount, 15);
                    } else {
                        counter.innerText = target.toLocaleString();
                    }
                };
                updateCount();
                observer.unobserve(counter);
            }
        });
    }, { threshold: 0.5 });
    counters.forEach(counter => observer.observe(counter));


    // ==================================================== //
    //              INTERACTIVE UI COMPONENTS               //
    // ==================================================== //
    
    // --- Mobile Menu ---
    const hamburger = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');
    const overlay = document.querySelector('.mobile-nav-overlay');

    const toggleMenu = () => {
        mobileNav.classList.toggle('active');
        overlay.classList.toggle('active');
    };
    if (hamburger) hamburger.addEventListener('click', toggleMenu);
    if (overlay) overlay.addEventListener('click', toggleMenu);

    // --- External Navigation Modal ---
    const navModal = document.getElementById('nav-modal');
    if (navModal) {
        const navModalMessage = document.getElementById('nav-modal-message');
        const navConfirmBtn = document.getElementById('nav-confirm-btn');
        const navCancelBtn = document.getElementById('nav-cancel-btn');
        document.body.addEventListener('click', (e) => {
            const trigger = e.target.closest('.service-link');
            if (trigger) {
                e.preventDefault();
                navModalMessage.textContent = "You are being redirected to our dedicated services platform, Gigs Hub. Continue?";
                navConfirmBtn.href = trigger.href;
                navModal.style.display = 'flex';
            }
        });
        navCancelBtn.addEventListener('click', () => { navModal.style.display = 'none'; });
        navModal.addEventListener('click', (e) => { if (e.target === navModal) navModal.style.display = 'none'; });
    }

    // --- AI Chat Modal ---
    const openChatBtn = document.getElementById('open-chat-button');
    const closeChatBtn = document.getElementById('close-chat-button');
    const chatModalContainer = document.getElementById('chat-modal-container');
    const chatModalOverlay = document.querySelector('.chat-modal-overlay');

    if (chatModalContainer) {
        const openModal = () => chatModalContainer.classList.add('active');
        const closeModal = () => chatModalContainer.classList.remove('active');

        openChatBtn.addEventListener('click', openModal);
        closeChatBtn.addEventListener('click', closeModal);
        chatModalOverlay.addEventListener('click', closeModal);
    }
});