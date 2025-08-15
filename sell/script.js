// Updated sell.js with FormData for image uploads
document.addEventListener('DOMContentLoaded', () => {
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

        // Use FormData to handle the file upload
        const formData = new FormData(sellForm);

        try {
            // Note: We don't set a 'Content-Type' header when using FormData.
            // The browser does it automatically.
            const response = await fetch('/.netlify/functions/create-product', {
                method: 'POST',
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
