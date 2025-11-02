/**
 * Creates an optimized and transformed Cloudinary URL.
 * @param {string} url The original Cloudinary URL.
 * @param {'thumbnail'|'full'} type The desired transformation type.
 * @returns {string} The new, transformed URL.
 */
function getCloudinaryTransformedUrl(url, type) {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || 'https://placehold.co/400x400/e0e0e0/777?text=No+Image';
    }
    const transformations = {
        thumbnail: 'c_fill,g_auto,w_250,h_250,f_auto,q_auto',
        full: 'c_limit,w_800,h_800,f_auto,q_auto'
    };
    const transformString = transformations[type] || transformations.thumbnail;
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) {
        return url;
    }
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}


import { db } from './firebase.js';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const profileHeader = document.getElementById('profile-header');
const sellerProductGrid = document.getElementById('seller-product-grid');
const listingsTitle = document.getElementById('listings-title');

const reviewsSection = document.getElementById('reviews-section');
const avgRatingSummary = document.getElementById('average-rating-summary');
const reviewsList = document.getElementById('reviews-list');


// --- NEW: Global Share Function ---
// We put this on the 'window' object so the 'onclick' attribute in the HTML can find it.
// This function will NOT run until a user clicks the button, fixing the load error.
window.handleProfileShare = async (sellerName) => {
    const shareData = {
        title: `View ${sellerName}'s Profile on Kabale Online`,
        text: `Check out all the listings from ${sellerName} on Kabale Online.`,
        url: window.location.href
    };
    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback for desktop
            await navigator.clipboard.writeText(window.location.href);
            alert('Profile link copied to clipboard!');
        }
    } catch (err) {
        console.error("Share failed:", err);
    }
};
// --- END NEW FUNCTION ---


document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sellerId = urlParams.get('sellerId');

    if (!sellerId) {
        profileHeader.innerHTML = '<h1>Seller not found.</h1>';
        listingsTitle.style.display = 'none';
        reviewsSection.style.display = 'none';
        return;
    }

    try {
        const userDocRef = doc(db, 'users', sellerId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            const sellerName = userData.name || 'Seller';
            const sellerLocation = userData.location;
            const sellerInstitution = userData.institution;
            const sellerBio = userData.bio;
            const profilePhotoUrl = userData.profilePhotoUrl || 'https://placehold.co/100x100/e0e0e0/777?text=User';
            const whatsappNumber = userData.whatsapp;
            const badges = userData.badges || [];
            
            const isVerified = userData.isVerified || badges.includes('verified');
            let badgesHTML = '';
            if (isVerified) {
                badgesHTML = `<div class="profile-verified-badge"><i class="fa-solid fa-circle-check"></i> Verified Seller</div>`;
            }

            let detailsHTML = '';
            if (sellerLocation) detailsHTML += `<p>📍 From ${sellerLocation}</p>`;
            if (sellerInstitution) detailsHTML += `<p>🎓 ${sellerInstitution}</p>`;
            let bioHTML = sellerBio ? `<p class="profile-bio">"${sellerBio}"</p>` : '';
            let contactHTML = '';
            if (whatsappNumber) {
                const whatsappLink = `https://wa.me/${whatsappNumber}?text=Hi, I saw your profile on Kabale Online.`;
                contactHTML = `<a href="${whatsappLink}" class="cta-button" target="_blank"><i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp</a>`;
            }

            // --- MODIFICATION: Added share button with 'onclick' ---
            // We also escape any ' characters in the seller's name to prevent an HTML error.
            const safeSellerName = sellerName.replace(/'/g, "\\'");
            
            profileHeader.innerHTML = `
                <div class="profile-header-flex">
                    <img src="${profilePhotoUrl}" alt="${sellerName}" class="profile-photo">
                    <div class="profile-details">
                        <div class="profile-title-header">
                            <h1>${sellerName}</h1>
                            <button onclick="handleProfileShare('${safeSellerName}')" class="share-btn" title="Share Profile">
                                <i class="fa-solid fa-share-alt"></i>
                            </button>
                        </div>
                        ${badgesHTML}
                        ${detailsHTML}
                    </div>
                </div>
                ${bioHTML}
                ${contactHTML}
            `;
            // --- END MODIFICATION ---
            
            document.title = `Profile for ${sellerName} | Kabale Online`;
            
            // The old, broken function call has been removed.

        } else {
            profileHeader.innerHTML = `<h1>Profile Not Found</h1>`;
            listingsTitle.style.display = 'none';
            reviewsSection.style.display = 'none';
        }
    } catch (error) {
        // This catch block will no longer run
        console.error("Error fetching user details:", error);
        profileHeader.innerHTML = `<h1>Error</h1><p>There was a problem loading this profile.</p>`;
        listingsTitle.style.display = 'none';
        reviewsSection.style.display = 'none';
    }

    // (The rest of your code for reviews and products is unchanged)
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
            avgRatingSummary.innerHTML = `<h3>Average Rating: ${avgRating} / 5.0 (${reviewsSnapshot.size} reviews)</h3>`;
        }
    } catch (error) {
        console.error("Error fetching reviews:", error);
        avgRatingSummary.innerHTML = "<p>Could not load seller reviews.</p>";
    }

    try {
        const q = query(
            collection(db, "products"), 
            where("sellerId", "==", sellerId), 
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        sellerProductGrid.innerHTML = '';
        if (querySnapshot.empty) {
            listingsTitle.textContent = 'This seller has no active listings.';
        } else {
            querySnapshot.forEach((doc) => {
                const product = doc.data();
                const productLink = document.createElement('a');
                productLink.href = `product.html?id=${doc.id}`;
                productLink.className = 'product-card-link';

                const originalImage = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : 'placeholder.webp';
                const thumbnailUrl = getCloudinaryTransformedUrl(originalImage, 'thumbnail');
                
                let tagsHTML = '';
                if (product.listing_type === 'rent') {
                    tagsHTML += '<span class="product-tag type-rent">FOR RENT</span>';
                } else if (product.listing_type === 'sale') {
                     tagsHTML += '<span class="product-tag type-sale">FOR SALE</span>';
                }
                
                if (product.condition === 'new') {
                    tagsHTML += '<span class="product-tag condition-new">NEW</span>';
                } else if (product.condition === 'used') {
                    tagsHTML += '<span class="product-tag condition-used">USED</span>';
                }
                const tagsContainerHTML = tagsHTML ? `<div class="product-tags">${tagsHTML}</div>` : '';

                productLink.innerHTML = `
                    <div class="product-card">
                        ${tagsContainerHTML}
                        <img src="${thumbnailUrl}" alt="${product.name}" loading="lazy">
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