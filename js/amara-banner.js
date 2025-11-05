// === AMARA AI BANNER V3 SCRIPT ===
document.addEventListener('DOMContentLoaded', function() {
    const banner = document.querySelector('.amara-banner-v3');
    const expandingTextElement = document.getElementById('amara-ai-expanding-text');
    const dynamicWordsContainer = document.getElementById('amara-dynamic-words-container');

    if (!banner || !expandingTextElement || !dynamicWordsContainer) {
        return; // Exit if banner elements aren't present
    }

    // --- The sequence of words to animate ---
    const wordSequence = [
        { text: "Search", classes: "amara-word-swipe-left", x: 10, y: 30, color: "var(--ko-accent)" },
        { text: "Learn", classes: "amara-word-drop-bounce", x: 70, y: 15, color: "var(--ko-primary)" },
        { text: "Discover", classes: "amara-word-swipe-right", x: 60, y: 70, color: "var(--ko-accent)" },
        { text: "Solve", classes: "amara-word-zoom-in", x: 45, y: 40, color: "white" },
        { text: "Find It", classes: "amara-word-fall-through", x: 25, y: 55, color: "var(--ko-primary)" }
    ];

    let currentWordIndex = 0;
    let mainLoopTimer = null;
    let wordLoopTimer = null;

    // --- Function to create and animate a single word ---
    function animateWord() {
        if (currentWordIndex >= wordSequence.length) {
            currentWordIndex = 0; // Loop back
        }

        const wordData = wordSequence[currentWordIndex];
        const wordEl = document.createElement('span');
        wordEl.textContent = wordData.text;
        wordEl.className = `amara-word ${wordData.classes}`;
        wordEl.style.color = wordData.color;
        wordEl.style.left = `${wordData.x}%`;
        wordEl.style.top = `${wordData.y}%`;

        dynamicWordsContainer.appendChild(wordEl);
        currentWordIndex++;

        // Schedule removal
        // 1. Fade out after 2.5 seconds
        setTimeout(() => {
            wordEl.classList.add('amara-word-fade-out');
        }, 2500); 

        // 2. Remove from DOM after fade out (2.5s + 0.5s fade)
        setTimeout(() => {
            wordEl.remove();
        }, 3000); 
    }

    // --- Function to start the main "Ask Amara AI" expansion ---
    function startExpandingText() {
        // Reset animation by removing and re-adding the class
        expandingTextElement.classList.remove('expanding');
        // Void reflow (a trick to force CSS to restart the animation)
        void expandingTextElement.offsetWidth; 
        expandingTextElement.classList.add('expanding');
    }

    // --- Main function to start and repeat the whole show ---
    function startFullAnimationCycle() {
        // 1. Clear any old timers
        clearInterval(mainLoopTimer);
        clearInterval(wordLoopTimer);
        
        // 2. Clear any leftover words
        dynamicWordsContainer.innerHTML = '';
        currentWordIndex = 0;

        // 3. Start the "Ask Amara AI" expansion
        startExpandingText();

        // 4. Start the word loop
        // It spawns a new word every 1.5 seconds
        animateWord(); // Spawn the first word immediately
        wordLoopTimer = setInterval(animateWord, 1500);
    }

    // --- Start the show! ---
    startFullAnimationCycle(); // Run it once on load
    // Repeat the entire 8-second cycle
    mainLoopTimer = setInterval(startFullAnimationCycle, 8000); 
});