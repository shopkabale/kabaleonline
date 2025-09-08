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
            const badges = userData.badges || [];

            let detailsHTML = '';
            if (sellerLocation) detailsHTML += `<p>📍 From ${sellerLocation}</p>`;
            if (sellerInstitution) detailsHTML += `<p>🎓 ${sellerInstitution}</p>`;

            let bioHTML = '';
            if (sellerBio) bioHTML = `<p class="profile-bio">"${sellerBio}"</p>`;

            let contactHTML = '';
            if (whatsappNumber) {
                const whatsappLink = `https://wa.me/${whatsappNumber}?text=Hi, I saw your profile on Kabale Online.`;
                contactHTML = `<a href="${whatsappLink}" class="cta-button" target="_blank"><i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp</a>`;
            }

            let badgesHTML = '';
            if (badges.length > 0) {
                badges.forEach(badge => {
                    if (badge === 'verified') {
                        badgesHTML += `<span class="badge-icon verified"><i class="fa-solid fa-circle-check"></i> Verified Seller</span>`;
                    }
                });
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
        }
    } catch (error) {
        console.error("Error fetching user details:", error);
        profileHeader.innerHTML = `<h1>Error</h1><p>There was a problem loading this profile.</p>`;
        listingsTitle.style.display = 'none';
    }

    if (document.querySelector('.profile-details')) {
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
                        <p class="price">UGX ${Number(product.price).toLocaleString()}</p>
                    </div>
                `;
                sellerProductGrid.appendChild(productLink);
            });
        } catch (error) {
            console.error("Error fetching listings:", error);
            listingsTitle.textContent = 'Could not load listings.';
        }
    }
});