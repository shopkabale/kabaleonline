import { db } from './firebase.js';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const profileHeader = document.getElementById('profile-header');
const sellerProductGrid = document.getElementById('seller-product-grid');
const listingsTitle = document.getElementById('listings-title');

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sellerId = urlParams.get('sellerId');

    if (!sellerId) {
        profileHeader.innerHTML = '<h1>Seller not found.</h1>';
        listingsTitle.style.display = 'none';
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
            const profilePhotoUrl = userData.profilePhotoUrl || 'placeholder.webp';
            const whatsappNumber = userData.whatsapp;
            const isVerified = userData.badges?.includes('verified') || false;

            let detailsHTML = '';
            if (sellerLocation) detailsHTML += `<p style="margin-top: -10px;">📍 From ${sellerLocation}</p>`;
            if (sellerInstitution) detailsHTML += `<p style="margin-top: -10px;">🎓 ${sellerInstitution}</p>`;

            let bioHTML = '';
            if (sellerBio) bioHTML = `<p class="profile-bio">"${sellerBio}"</p>`;

            let contactHTML = '';
            if (whatsappNumber) {
                const whatsappLink = `https://wa.me/${whatsappNumber}?text=Hi, I saw your profile on Kabale Online.`;
                contactHTML = `<a href="${whatsappLink}" class="cta-button" target="_blank" style="margin-top: 15px; display: inline-block;"><i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp</a>`;
            }

            const verifiedBadge = isVerified 
                ? `<svg class="verified-badge-svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>` 
                : '';

            profileHeader.innerHTML = `
                <div class="profile-header-flex">
                    <img src="${profilePhotoUrl}" alt="${sellerName}" class="profile-photo">
                    <div class="profile-details">
                        <h1 style="display: flex; align-items: center; gap: 10px;">${sellerName} ${verifiedBadge}</h1>
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
        }
    } catch (error) {
        console.error("Error fetching user details:", error);
        profileHeader.innerHTML = `<h1>Error</h1><p>There was a problem loading this profile.</p>`;
        listingsTitle.style.display = 'none';
    }

    if (document.querySelector('.profile-details')) {
        try {
            const q = query(collection(db, "products"), where("sellerId", "==", sellerId), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            sellerProductGrid.innerHTML = '';
            if (querySnapshot.empty) {
                listingsTitle.textContent = 'This seller has no active listings.';
                return;
            }
            querySnapshot.forEach((doc) => {
                const product = doc.data();
                const productLink = document.createElement('a');
                productLink.href = `product.html?id=${doc.id}`;
                productLink.className = 'product-card-link';
                productLink.innerHTML = `
                    <div class="product-card">
                        <img src="${(product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : 'placeholder.webp'}" alt="${product.name}">
                        <h3>${product.name}</h3>
                        <p class="price">UGX ${product.price.toLocaleString()}</p>
                    </div>
                `;
                sellerProductGrid.appendChild(productLink);
            });
        } catch (error) {
            listingsTitle.textContent = 'Could not load listings.';
        }
    }
});
