// This is the script for the sell/index.html page
document.addEventListener('DOMContentLoaded', () => {
    // Protect the page: if user is not logged in, redirect them
    const user = netlifyIdentity.currentUser();
    if (!user) {
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
        const productData = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/.netlify/functions/create-product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData),
            });

            if (!response.ok) {
                throw new Error('Submission failed. Please try again.');
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
