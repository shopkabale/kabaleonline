// This is the new login.js file
document.addEventListener('DOMContentLoaded', () => {
    // This initializes the widget and places it in our container
    netlifyIdentity.init();
    const widgetContainer = document.getElementById('netlify-identity-container');
    netlifyIdentity.open(); // Open the login modal immediately
});
