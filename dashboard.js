// This script manages the seller dashboard page
document.addEventListener('DOMContentLoaded', () => {
    const user = netlifyIdentity.currentUser();
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');
    const myProductsGrid = document.getElementById('my-products-grid');

    // Protect the page
    if (!user) {
        return window.location.href = '/login.html';
    } else {
        welcomeMessage.textContent = `Welcome, ${user.email}!`;
    }

    // Make the logout button work
    logoutButton.addEventListener('click', () => {
        netlifyIdentity.logout();
    });
    netlifyIdentity.on('logout', () => {
        window.location.href = '/';
    });

    // --- NEW: Function to fetch and display the seller's products ---
    async function fetchMyProducts() {
        if (!myProductsGrid) return;
        
        try {
            const response = await fetch('/.netlify/functions/get-my-products', {
                headers: {
                    'Authorization': `Bearer ${user.token.access_token}`
                }
            });

            if (!response.ok) {
                throw new Error('Could not fetch your products.');
            }

            const data = await response.json();
            myProductsGrid.innerHTML = ''; // Clear the "Loading..." message

            if (data.results.length === 0) {
                myProductsGrid.innerHTML = "<p>You have not submitted any products yet. Click 'Sell a New Item' to get started!</p>";
                return;
            }

            // Reuse the product card style from the main page
            data.results.forEach(product => {
                const card = document.createElement('article');
                card.className = 'product-card';
                const imageUrl = product.ImageURL || '';
                const formattedPrice = new Intl.NumberFormat('en-US').format(product.Price);

                card.innerHTML = `
                    <img src="${imageUrl}" alt="${product.Name}" loading="lazy">
                    <div class="product-info">
                        <h2 class="product-name">${product.Name}</h2>
                        <p class="product-price">UGX ${formattedPrice}</p>
                        <p class="product-seller">Status: ${product.Status}</p>
                    </div>
                `;
                myProductsGrid.appendChild(card);
            });

        } catch (error) {
            myProductsGrid.innerHTML = `<p>${error.message}</p>`;
        }
    }

    // Call the function to load the products when the dashboard opens
    fetchMyProducts();
});
