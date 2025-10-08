import { db } from './firebase.js';
import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- UTILITY FUNCTIONS ---
function getCloudinaryTransformedUrl(url, type = 'thumbnail') {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || 'https://placehold.co/200x200/e0e0e0/777?text=No+Image';
    }
    const transformString = 'c_fill,g_auto,w_400,h_400,f_auto,q_auto';
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) return url;
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}

// --- DATA FETCHING FUNCTIONS ---
async function fetchTrendingProducts() {
    const trendingGrid = document.getElementById('trending-products-grid');
    if (!trendingGrid) return;
    
    try {
        const trendingQuery = query(
            collection(db, 'products'),
            where('isHero', '==', true),
            where('isSold', '==', false),
            orderBy('heroTimestamp', 'desc'),
            limit(8)
        );
        const snapshot = await getDocs(trendingQuery);

        if (snapshot.empty) {
            trendingGrid.innerHTML = '<p style="padding: 0 15px;">No trending products found.</p>';
            return;
        }

        trendingGrid.innerHTML = "";
        const fragment = document.createDocumentFragment();
        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            const thumbnailUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0]);

            const productCard = document.createElement('a');
            productCard.href = `/shop/product.html?id=${product.id}`;
            productCard.className = "product-card modal-trigger";
            productCard.dataset.url = `/shop/product.html?id=${product.id}`;
            
            productCard.innerHTML = `
                <img src="${thumbnailUrl}" alt="${product.name}">
                <div class="product-card-content">
                    <h3>${product.name}</h3>
                    <p class="price">UGX ${product.price ? product.price.toLocaleString() : "N/A"}</p>
                </div>
            `;
            fragment.appendChild(productCard);
        });
        trendingGrid.appendChild(fragment);

    } catch (error) {
        console.error("Error fetching trending products:", error);
        trendingGrid.innerHTML = '<p style="padding: 0 15px;">Could not load products.</p>';
    }
}

async function fetchTestimonials() {
    const testimonialGrid = document.getElementById('testimonial-grid');
    if (!testimonialGrid) return;
    try {
        const testimonialsQuery = query(collection(db, 'testimonials'), where('status', '==', 'approved'), orderBy('order', 'asc'), limit(2));
        const querySnapshot = await getDocs(testimonialsQuery);
        if (querySnapshot.empty) {
            testimonialGrid.closest('.testimonial-section').style.display = 'none';
            return;
        }
        testimonialGrid.innerHTML = '';
        querySnapshot.forEach(doc => {
            const testimonial = doc.data();
            const card = document.createElement('div');
            card.className = 'testimonial-card';
            card.innerHTML = `
                <p class="testimonial-text">"${testimonial.quote}"</p>
                <p class="testimonial-author">&ndash; ${testimonial.authorName}</p>
            `;
            testimonialGrid.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching testimonials:", error);
    }
}


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    
    // --- THEME TOGGLE LOGIC ---
    const themeToggle = document.getElementById('theme-toggle');
    function setTheme(theme) {
        document.body.className = theme;
        localStorage.setItem('theme', theme);
        themeToggle.checked = (theme === 'light-mode');
    }
    const currentTheme = localStorage.getItem('theme') || 'light-mode';
    setTheme(currentTheme);
    themeToggle.addEventListener('change', () => setTheme(themeToggle.checked ? 'light-mode' : 'dark-mode'));

    // --- HERO SLIDER LOGIC ---
    const slides = document.querySelectorAll('.hero-slider .slide');
    let currentSlide = 0;
    if (slides.length > 0) {
        setInterval(() => {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }, 5000);
    }

    // --- ANIMATED STATS COUNTER ---
    const counters = document.querySelectorAll('.stat-number');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const animate = () => {
                    const target = +counter.getAttribute('data-target');
                    const count = +counter.innerText.replace(/,/g, '');
                    const inc = target / 200; // Speed of the animation

                    if (count < target) {
                        counter.innerText = Math.ceil(count + inc);
                        setTimeout(animate, 10);
                    } else {
                        counter.innerText = target.toLocaleString();
                    }
                };
                animate();
                observer.unobserve(counter);
            }
        });
    }, { threshold: 0.5 });
    counters.forEach(counter => { if (counter.getAttribute('data-target')) observer.observe(counter); });

    // --- NAVIGATION MODAL LOGIC ---
    const navModal = document.getElementById('nav-modal');
    const navModalMessage = document.getElementById('nav-modal-message');
    const navConfirmBtn = document.getElementById('nav-confirm-btn');
    const navCancelBtn = document.getElementById('nav-cancel-btn');

    document.body.addEventListener('click', (e) => {
        const trigger = e.target.closest('.modal-trigger');
        if (trigger) {
            e.preventDefault();
            const url = trigger.dataset.url;
            const isExternal = url.startsWith('http');
            
            navModalMessage.textContent = isExternal 
                ? "You are about to visit an external site. Do you want to continue?"
                : "You are about to leave the landing page to browse our shop. Continue?";
            
            navConfirmBtn.href = url;
            navModal.style.display = 'flex';
        }
    });

    navCancelBtn.addEventListener('click', () => {
        navModal.style.display = 'none';
    });
    navModal.addEventListener('click', (e) => {
        if (e.target === navModal) navModal.style.display = 'none';
    });

    // --- FETCH DYNAMIC CONTENT ---
    fetchTrendingProducts();
    fetchTestimonials();
});