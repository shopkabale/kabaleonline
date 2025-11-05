// This script is self-contained and will only run when the banner is on the page.
document.addEventListener('DOMContentLoaded', function() {
    const promptContainer = document.getElementById('amara-prompt-container');
    const promptEl = document.getElementById('amara-prompt-text');

    // Check if the banner elements exist on this page
    if (!promptContainer || !promptEl) {
        return; // Do nothing if the banner isn't here
    }

    // --- Prompts to showcase Amara's dual capabilities ---
    const prompts = [
        { 
            text: "Give me 5 study tips for exams", 
            type: "knowledge" // Will use "fall" animation
        },
        { 
            text: "Find me a plumber in Kabale", 
            type: "search" // Will use "swipe" animation
        },
        { 
            text: "Compare the iPhone 12 and iPhone 13", 
            type: "knowledge" 
        },
        { 
            text: "What's the best deal on a used laptop?", 
            type: "search" 
        },
        { 
            text: "What's happening this weekend?", 
            type: "search" 
        },
        { 
            text: "Explain what Algolia is", 
            type: "knowledge" 
        }
    ];
    
    let index = 0;

    function rotatePrompts() {
        const currentPrompt = prompts[index];
        
        // 1. Get the correct "out" animation based on type
        const outAnimation = currentPrompt.type === 'knowledge' ? 'amara-text-fall-out' : 'amara-text-swipe-out';
        promptEl.className = outAnimation;

        // 2. Wait for the "out" animation (400ms)
        setTimeout(() => {
            // Change index to the next prompt
            index = (index + 1) % prompts.length;
            const nextPrompt = prompts[index];
            
            // 3. Set new text and the "start" state for the "in" animation
            const startAnimation = nextPrompt.type === 'knowledge' ? 'amara-text-fall-start' : 'amara-text-swipe-start';
            promptEl.textContent = `"${nextPrompt.text}"`;
            promptEl.className = startAnimation;

            // 4. Wait a tiny bit (a "tick") for the browser to apply the "start" state
            setTimeout(() => {
                // 5. Apply the "in" animation
                const inAnimation = nextPrompt.type === 'knowledge' ? 'amara-text-fall-in' : 'amara-text-swipe-in';
                promptEl.className = inAnimation;
            }, 50);

        }, 400); // This MUST match the CSS transition-duration (0.4s)
    }

    // --- Start the animation ---
    const firstPrompt = prompts[index];
    promptEl.textContent = `"${firstPrompt.text}"`;
    promptEl.className = 'amara-text-fall-in';
    
    // Loop every 4 seconds
    setInterval(rotatePrompts, 4000);

    // --- Click handler for the button has been REMOVED ---
    // The <a> tag now handles the click all by itself.
});