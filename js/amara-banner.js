// === AMARA AI BANNER V4 SCRIPT ===
document.addEventListener('DOMContentLoaded', function() {
    const wordElement = document.getElementById('amara-animated-word');
    if (!wordElement) return;

    // --- The Sequence of Animations ---
    const sequence = [
        { 
            text: "Ask Amara AI", 
            color: "var(--ko-accent)", 
            animation: "amara-anim-zoom-pop" // Pop out of screen
        },
        { 
            text: "Search", 
            color: "var(--ko-accent)", 
            animation: "amara-anim-swipe-left" // Swipe left + underline
        },
        { 
            text: "Learn", 
            color: "var(--ko-primary)", 
            animation: "amara-anim-drop-in" // Drop in
        },
        { 
            text: "Find It", 
            color: "white", 
            animation: "amara-anim-fall-through" // Fall through
        },
        { 
            text: "Discover", 
            color: "var(--ko-accent)", 
            animation: "amara-anim-zoom-pop" // Pop out again
        },
        { 
            text: "Solve", 
            color: "var(--ko-primary)", 
            animation: "amara-anim-drop-in" // Drop in
        }
    ];

    let currentIndex = 0;
    const inDuration = 1000; // 1s for "in" animation
    const holdDuration = 2000; // 2s to show the word
    const outDuration = 500; // 0.5s for "out" animation

    function runAnimation() {
        // --- 1. GET THE NEXT ITEM ---
        const item = sequence[currentIndex];
        
        // --- 2. FADE-OUT THE OLD WORD ---
        // Add "amara-word-out" to whatever animation is currently on
        wordElement.className = "amara-word-out " + (wordElement.dataset.anim || "");
        
        // --- 3. AFTER FADE-OUT, PREP AND FADE-IN NEW WORD ---
        setTimeout(() => {
            // Remove all old classes
            wordElement.className = ""; 
            
            // Set new properties
            wordElement.textContent = item.text;
            wordElement.style.color = item.color;
            wordElement.dataset.anim = item.animation; // Store the animation name

            // Add the new "IN" classes
            wordElement.classList.add('amara-word-in', item.animation);
            
            // Update index for next time
            currentIndex = (currentIndex + 1) % sequence.length;

        }, outDuration); // Wait for the fade-out to finish
    }

    // --- Start the Loop ---
    runAnimation(); // Run the first animation immediately
    setInterval(runAnimation, inDuration + holdDuration); // Loop
});