
    import { db } from './firebase.js';
    import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

    // Your existing Firebase functions remain the same
    function getCloudinaryTransformedUrl(url, type = 'thumbnail') {
        if (!url || !url.includes('res.cloudinary.com')) {
            return url || 'https://placehold.co/200x200/e0e0e0/777?text=No+Image';
        }
        const transformString = 'c_fill,g_auto,w_400,h_400,f_auto,q_auto';
        const urlParts = url.split('/upload/');
        if (urlParts.length !== 2) return url;
        return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
    }

    async function fetchTrendingProducts() {
        const trendingGrid = document.getElementById('trending-products-grid');
        if (!trendingGrid) return;
        try {
            const trendingQuery = query(collection(db, 'products'), where('isHero', '==', true), where('isSold', '==', false), orderBy('heroTimestamp', 'desc'), limit(8));
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
                productCard.href = `/product.html?id=${product.id}`;
                productCard.className = "product-card";
                productCard.innerHTML = `<img src="${thumbnailUrl}" alt="${product.name}"><div class="product-card-content"><h3>${product.name}</h3><p class="price">UGX ${product.price ? product.price.toLocaleString() : "N/A"}</p></div>`;
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
                card.innerHTML = `<p class="testimonial-text">"${testimonial.quote}"</p><p class="testimonial-author">&ndash; ${testimonial.authorName}</p>`;
                testimonialGrid.appendChild(card);
            });
        } catch (error) {
            console.error("Error fetching testimonials:", error);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        // --- HEADING TYPING ANIMATION ---
        const typingTextElement = document.getElementById('typing-text');
        if (typingTextElement) {
            const words = ["Shoes", "Electronics", "Clothes", "Laptops", "Text Books", "Smartphones", "Furniture", " anything "];
            let wordIndex = 0;
            let charIndex = 0;
            let isDeleting = false;

            function type() {
                const currentWord = words[wordIndex];
                const speed = isDeleting ? 100 : 200;

                if (isDeleting) {
                    typingTextElement.textContent = currentWord.substring(0, charIndex - 1);
                    charIndex--;
                } else {
                    typingTextElement.textContent = currentWord.substring(0, charIndex + 1);
                    charIndex++;
                }

                if (!isDeleting && charIndex === currentWord.length) {
                    setTimeout(() => isDeleting = true, 2000);
                } else if (isDeleting && charIndex === 0) {
                    isDeleting = false;
                    wordIndex = (wordIndex + 1) % words.length;
                }
                setTimeout(type, speed);
            }
            type();
        }

        // --- MOBILE MENU LOGIC ---
        const hamburger = document.querySelector('.hamburger-menu');
        const mobileNav = document.querySelector('.mobile-nav');
        const overlay = document.querySelector('.mobile-nav-overlay');
        if(hamburger) {
            hamburger.addEventListener('click', () => {
                mobileNav.classList.toggle('active');
                overlay.classList.toggle('active');
            });
        }
        if(overlay) {
            overlay.addEventListener('click', () => {
                mobileNav.classList.remove('active');
                overlay.classList.remove('active');
            });
        }

        // --- START: NEW SEARCH BAR TYPING ANIMATION ---
        const searchBar = document.getElementById('hero-search-input');
        if (searchBar) {
            const placeholderPhrases = [
                "Search for laptops...",
                "Try searching 'iPhone X'...",
                "Find textbooks...",
                "Search for clothes...",
                "Try 'Nike shoes'...",
                "Find affordable electronics..."
            ];
            let phraseIndex = 0;
            let charIndex = 0;
            let isDeleting = false;
            const typingSpeed = 150;
            const deletingSpeed = 75;
            const pauseDuration = 1500;

            function typePlaceholder() {
                const currentPhrase = placeholderPhrases[phraseIndex];
                let displayText = '';

                if (isDeleting) {
                    displayText = currentPhrase.substring(0, charIndex - 1);
                    charIndex--;
                } else {
                    displayText = currentPhrase.substring(0, charIndex + 1);
                    charIndex++;
                }

                searchBar.placeholder = displayText;

                if (!isDeleting && charIndex === currentPhrase.length) {
                    isDeleting = true;
                    setTimeout(typePlaceholder, pauseDuration);
                    return;
                } else if (isDeleting && charIndex === 0) {
                    isDeleting = false;
                    phraseIndex = (phraseIndex + 1) % placeholderPhrases.length;
                    setTimeout(typePlaceholder, 500);
                    return;
                }

                const speed = isDeleting ? deletingSpeed : typingSpeed;
                setTimeout(typePlaceholder, speed);
            }
            typePlaceholder();
        }
        // --- END: NEW SEARCH BAR TYPING ANIMATION ---

        // --- COUNTER ANIMATION LOGIC ---
        const counters = document.querySelectorAll('.stat-number');
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const animate = () => {
                        const target = +counter.getAttribute('data-target');
                        if (isNaN(target)) return;
                        const count = +counter.innerText.replace(/,/g, '');
                        const inc = target / 100;

                        if (count < target) {
                            counter.innerText = Math.ceil(count + inc).toLocaleString();
                            setTimeout(animate, 15);
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

        // --- MODAL LOGIC ---
        const navModal = document.getElementById('nav-modal');
        const navModalMessage = document.getElementById('nav-modal-message');
        const navConfirmBtn = document.getElementById('nav-confirm-btn');
        const navCancelBtn = document.getElementById('nav-cancel-btn');

        document.body.addEventListener('click', (e) => {
            const trigger = e.target.closest('.service-link');
            if (trigger) {
                e.preventDefault();
                const url = trigger.href;
                navModalMessage.textContent = "You are being redirected to our dedicated services platform, Gigs Hub. Continue?";
                navConfirmBtn.href = url;
                navModal.style.display = 'flex';
            }
        });

        navCancelBtn.addEventListener('click', () => { navModal.style.display = 'none'; });
        navModal.addEventListener('click', (e) => { if (e.target === navModal) navModal.style.display = 'none'; });

        // --- FETCH DYNAMIC CONTENT ---
        fetchTrendingProducts();
        fetchTestimonials();
    });
</script>
<script>
document.addEventListener('DOMContentLoaded', function() {
    // --- Get the essential elements ---
    const openChatButton = document.getElementById('open-chat-button');
    const closeChatButton = document.getElementById('close-chat-button');
    const chatModalContainer = document.getElementById('chat-modal-container');
    const chatModalOverlay = document.querySelector('.chat-modal-overlay');

    // --- Simple and reliable open/close functions ---

    // Function to open the modal
    function openModal() {
        if (chatModalContainer) {
            // This simply makes the container visible
            chatModalContainer.classList.add('active');
        }
    }

    // Function to close the modal
    function closeModal() {
        if (chatModalContainer) {
            // This simply hides the container again
            chatModalContainer.classList.remove('active');
        }
    }

    // --- Attach the click event listeners ---

    // When the floating button is clicked, open the modal
    if (openChatButton) {
        openChatButton.addEventListener('click', openModal);
    }

    // When the 'X' button inside the modal is clicked, close it
    if (closeChatButton) {
        closeChatButton.addEventListener('click', closeModal);
    }

    // When the dark background overlay is clicked, close the modal
    if (chatModalOverlay) {
        chatModalOverlay.addEventListener('click', closeModal);
    }
});