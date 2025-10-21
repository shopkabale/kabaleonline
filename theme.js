// File: theme.js

// Apply the theme to the <body> tag
function applyTheme(theme) {
    document.body.className = ''; // Clear any existing theme class
    document.body.classList.add(theme);
}

// Initialize the theme toggle functionality
function initializeThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeHint = document.getElementById('theme-hint'); // <span> or <small> to show hint

    if (themeToggle) {
        // Load saved theme or default to light
        const currentTheme = localStorage.getItem('theme') || 'light-mode';
        themeToggle.checked = (currentTheme === 'light-mode');
        applyTheme(currentTheme);

        // Update hint text
        if (themeHint) {
            themeHint.textContent = themeToggle.checked
                ? '🌞 Light mode is ON'
                : '🌙 Dark mode is ON';
        }

        // Listen for toggle change
        themeToggle.addEventListener('change', function() {
            const newTheme = this.checked ? 'light-mode' : 'dark-mode';
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);

            // Update hint dynamically
            if (themeHint) {
                themeHint.textContent = this.checked
                    ? '🌞 Light mode is ON'
                    : '🌙 Dark mode is ON';
            }
        });
    }
}

// --- Main Execution ---
const savedTheme = localStorage.getItem('theme') || 'light-mode'; // Default to light-mode
applyTheme(savedTheme);
document.addEventListener('DOMContentLoaded', initializeThemeToggle);