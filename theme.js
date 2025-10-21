// File: theme.js

// This function applies the theme to the <body> tag.
function applyTheme(theme) {
    document.body.className = ''; // Clear any existing theme class
    document.body.classList.add(theme);
}

// This function sets up the theme toggle button functionality.
function initializeThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');

    // Only proceed if the toggle button exists on the current page.
    if (themeToggle) {
        // Set the toggle's initial state based on the current theme.
        const currentTheme = localStorage.getItem('theme') || 'light-mode';
        themeToggle.checked = (currentTheme === 'light-mode');

        // Add an event listener to handle changes.
        themeToggle.addEventListener('change', function() {
            const newTheme = this.checked ? 'light-mode' : 'dark-mode';

            // Apply the new theme.
            applyTheme(newTheme);

            // Save the user's preference for future visits.
            localStorage.setItem('theme', newTheme);
        });
    }
}

// --- Main Execution ---

// 1. Immediately apply the saved theme on script load to prevent flashing.
const savedTheme = localStorage.getItem('theme') || 'light-mode'; // Default to light-mode
applyTheme(savedTheme);

// 2. Set up the toggle button once the full page content has loaded.
document.addEventListener('DOMContentLoaded', initializeThemeToggle);