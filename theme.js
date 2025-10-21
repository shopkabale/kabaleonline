function applyTheme(theme) {
    document.body.className = '';
    document.body.classList.add(theme);
}

function initializeThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeHint = document.getElementById('theme-hint');

    if (themeToggle && themeHint) {
        const currentTheme = localStorage.getItem('theme') || 'light-mode';
        themeToggle.checked = (currentTheme === 'light-mode');
        applyTheme(currentTheme);

        // Set hint text
        themeHint.textContent = themeToggle.checked
            ? '🌞 Light mode is ON'
            : '🌙 Dark mode is ON';

        // Show hint for 10 seconds on page load
        themeHint.style.opacity = '1';
        setTimeout(() => {
            themeHint.style.opacity = '0';
        }, 10000); // 10000ms = 10s

        // Update theme on toggle
        themeToggle.addEventListener('change', function() {
            const newTheme = this.checked ? 'light-mode' : 'dark-mode';
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);

            // Update hint text
            themeHint.textContent = this.checked
                ? '🌞 Light mode is ON'
                : '🌙 Dark mode is ON';

            // Show hint for 2 seconds after toggle (optional)
            themeHint.style.opacity = '1';
            setTimeout(() => {
                themeHint.style.opacity = '0';
            }, 2000);
        });
    }
}

// Apply saved theme immediately
const savedTheme = localStorage.getItem('theme') || 'light-mode';
applyTheme(savedTheme);

// Initialize toggle when DOM is ready
document.addEventListener('DOMContentLoaded', initializeThemeToggle);