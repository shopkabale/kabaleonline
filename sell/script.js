// The corrected sell/script.js file
document.addEventListener('DOMContentLoaded', () => {
    const user = netlifyIdentity.currentUser();
    if (!user) {
        // If no user is logged in, redirect to the login page
        return window.location.href = '/login.html';
    }

    const sellForm = document.getElementById('sell-form');
    const submitButton = document.getElementById('submit-button');
    const formStatus = document.getElementById('form-status');

    sellForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitButton.disabled = true;
        formStatus.textContent = 'Submitting your product...';

        const formData = new FormData(sellForm);

        try {
            // Get the user's access token to prove they are logged in
            const token = user.token.access_token;

            // Note: We don't set a 'Content-Type' header when using FormData.
            // The browser does it automatically.
            const response = await fetch('/.netlify/functions/create-product', {
                method: 'POST',
                headers: {
                    // --- THIS IS THE FIX: We add the login token here ---
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Submission failed. Please try again.');
            }

            const result = await response.json();
            formStatus.textContent = 'Success! Your product has been submitted for review.';
            sellForm.reset();

        } catch (error) {
            formStatus.textContent = error.message;
        } finally {
            submitButton.disabled = false;
        }
    });
});
