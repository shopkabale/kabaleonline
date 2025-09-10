import { db } from './firebase.js';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Existing element references
const profileHeader = document.getElementById('profile-header');
const sellerProductGrid = document.getElementById('seller-product-grid');
const listingsTitle = document.getElementById('listings-title');

// NEW: Element references for the reviews section
const reviewsSection = document.getElementById('reviews-section');
const avgRatingSummary = document.getElementById('average-rating-summary');
const reviewsList = document.getElementById('reviews-list');

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sellerId = urlParams.get('sellerId');

    if (!sellerId) {
        profileHeader.innerHTML = '<h1>Seller not found.</h1>';
        listingsTitle.style.display = 'none';
        reviewsSection.style.display = 'none'; // Hide reviews if no seller
        return;
    }

    // --- 1. Fetch and Display Seller Profile ---
    try {
        const userDocRef = doc(db, 'users', sellerId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            const sellerName = userData.name || 'Seller';
            const sellerLocation = userData.location;
            const sellerInstitution = userData.institution;
            const sellerBio = userData.bio;
            const profilePhotoUrl = userData.profilePhotoUrl || 'https://placehold.co/100x100/e0e0e0/777?text=No+Photo';
            const whatsappNumber = userData.whatsapp;
            const badges = userData.badges || [];

            let detailsHTML = '';
            if (sellerLocation) detailsHTML += `<p>📍 From ${sellerLocation}</p>`;
            if (sellerInstitution) detailsHTML += `<p>🎓 ${sellerInstitution}</p>`;
            if (bio) detailsHTML += `<p class="profile-bio">"${sellerBio}"</p>`;

            let contactHTML = '';
            if (whatsappNumber) {
                const whatsappLink = `https://wa.me/${whatsappNumber}?text=Hi, I saw your profile on Kabale Online.`;
                contactHTML = `<a href="${whatsappLink}" class="cta-button" target="_blank" style="margin-top:15px; display:inline-block;"><i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp</a>`;
            }
            
            let badgesHTML = '';
            if (badges.includes('verified')) {
                badgesHTML += `<span class="badge-icon verified"><i class="fa-solid fa-circle-check"></i> Verified Seller</span>`;
            }

            profileHeader.innerHTML = `
                <div class="profile-header-flex">
                    <img src="${profilePhotoUrl}" alt="${sellerName}" class="profile-photo">
                    <div class="profile-details">
                        <h1>${sellerName}</h1>
                        ${badgesHTML}
                        ${detailsHTML}
                    </div>
                </div>
                ${bioHTML}
                ${contactHTML}
            `;
            document.title = `Profile for ${sellerName} | Kabale Online`;
        } else {
             profileHeader.innerHTML = `<h1>Profile Not Found</h1><p>This seller does not seem to exist.</p>`;
            listingsTitle.style.display = 'none';
            reviewsSection.style.display = 'none';
        }
    } catch (error) {
        console.error("Error fetching user details:", error);
        profileHeader.innerHTML = `<h1>Error</h1><p>There was a problem loading this profile.</p>`;
        listingsTitle.style.display = 'none';
        reviewsSection.style.display = 'none';
    }

    // --- 2. Fetch and Display Reviews ---
    try {
        const reviewsQuery = query(collection(db, `users/${sellerId}/reviews`), orderBy('timestamp', 'desc'));
        const reviewsSnapshot = await getDocs(reviewsQuery);

        if (reviewsSnapshot.empty) {
            avgRatingSummary.innerHTML = "<p>This seller has no reviews yet.</p>";
        } else {
            let totalRating = 0;
            reviewsList.innerHTML = '';
            reviewsSnapshot.forEach(doc => {
                const review = doc.data();
                totalRating += review.rating;
                const reviewCard = document.createElement('div');
                reviewCard.className = 'review-card';
                reviewCard.innerHTML = `
                    <div class="star-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                    <p>${review.text}</p>
                    <p class="review-author">- ${review.reviewerName || 'Anonymous'}</p>
                `;
                reviewsList.appendChild(reviewCard);
            });

            const avgRating = (totalRating / reviewsSnapshot.size).toFixed(1);
            avgRatingSummary.innerHTML = `
                <h3>
                    Average Rating: ${avgRating} / 5.0 
                    <span class="star-rating" style="font-size: 1em; vertical-align: middle;">${'★'.repeat(Math.round(avgRating))}</span>
                    (${reviewsSnapshot.size} reviews)
                </h3>
            `;
        }
    } catch (error) {
        console.error("Error fetching reviews:", error);
        avgRatingSummary.innerHTML = "<p>Could not load reviews.</p>";
    }

    // --- 3. Fetch and Display Seller's Listings ---
    try {
        const productsQuery = query(
            collection(db, "products"), 
            where("sellerId", "==", sellerId), 
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(productsQuery);
        sellerProductGrid.innerHTML = '';
        if (querySnapshot.empty) {
            listingsTitle.textContent = 'This seller has no active listings.';
        } else {
            querySnapshot.forEach((doc) => {
                const product = doc.data();
                if (product.isSold) return; // Don't show sold items on profile
                const productLink = document.createElement('a');
                productLink.href = `/product.html?id=${doc.id}`;
                productLink.className = 'product-card-link';
                productLink.innerHTML = `
                    <div class="product-card">
                        <img src="${product.imageUrls?.[0] || 'placeholder.webp'}" alt="${product.name}">
                        <h3>${product.name}</h3>
                        <p class="price">UGX ${Number(product.price).toLocaleString()}</p>
                    </div>
                `;
                sellerProductGrid.appendChild(productLink);
            });
        }
    } catch (error) {
        console.error("Error fetching listings:", error);
        listingsTitle.textContent = 'Could not load listings.';
    }
});
