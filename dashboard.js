// This script manages the seller dashboard page

document.addEventListener('DOMContentLoaded', () => {
    const user = netlifyIdentity.currentUser();
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');

    // STEP 1: Protect the page
    if (!user) {
        // If no user is logged in, redirect to the login page
        window.location.href = '/login.html';
    } else {
        // If a user is logged in, show their email in the welcome message
        welcomeMessage.textContent = `Welcome, ${user.email}!`;
    }

    // STEP 2: Make the logout button work
    logoutButton.addEventListener('click', () => {
        netlifyIdentity.logout();
    });

    // When the user logs out, redirect them to the homepage
    netlifyIdentity.on('logout', () => {
        window.location.href = '/';
    });

    // STEP 3: We will add the code to fetch the seller's products here later
    // For now, let's just show a placeholder message
    const myProductsGrid = document.getElementById('my-products-grid');
    if (myProductsGrid) {
        myProductsGrid.innerHTML = "<p>Your approved products will appear here soon.</p>";
    }
});
