// File Path: bot/chatbot.js

document.addEventListener('DOMContentLoaded', function() {
    // Apply theme from parent page's localStorage to match the site
    const savedTheme = localStorage.getItem('theme') || 'light-mode';
    document.body.className = '';
    document.body.classList.add(savedTheme);

    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    
    // --- TYPO-CORRECTION LOGIC ---
    function levenshteinDistance(a, b) {
        if (a.length === 0) return b.length; if (b.length === 0) return a.length;
        const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
        for (let i = 0; i <= a.length; i++) { matrix[0][i] = i; }
        for (let j = 0; j <= b.length; j++) { matrix[j][0] = j; }
        for (let j = 1; j <= b.length; j++) {
            for (let i = 1; i <= a.length; i++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + cost);
            }
        }
        return matrix[b.length][a.length];
    }

    // --- ONLINE "TOOLS" ---
    async function callProductLookupAPI(params) {
        try {
            const res = await fetch('/.netlify/functions/product-lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            if (!res.ok) throw new Error('Server error');
            const data = await res.json();
            return { text: data.text, suggestions: ["Show me clothing", "Contact the admin"] };
        } catch (err) {
            console.error("Lookup API failed:", err);
            return answers['help'];
        }
    }
    async function logQueryToServer(message) {
      try {
        await fetch('/.netlify/functions/log-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: message })
        });
      } catch (error) {
        console.warn("Could not log query to the server.");
      }
    }

    // --- ⭐ HYBRID BOT BRAIN (FINAL UPGRADED VERSION) ⭐ ---
    async function getBotReply(message) {
        const text = message.toLowerCase().trim();
        
        // PRIORITY 1: Handle specific "How-to" questions first (offline)
        const howToActions = {
            sell: ['how to sell', 'how do i sell'],
            buy: ['how to buy', 'how do i buy'],
            rent: ['how to rent', 'how do i rent']
        };
        for (const action in howToActions) {
            for (const phrase of howToActions[action]) {
                if (text.startsWith(phrase)) { return answers[action]; }
            }
        }

        // PRIORITY 2: Check for specific category queries (online)
        for (const key in responses) {
            if (key.startsWith("category_")) {
                for (const keyword of responses[key]) {
                    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                    if (regex.test(text)) {
                        let categoryName = key.replace("category_", "");
                        categoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
                        if (categoryName === 'Clothing') categoryName = 'Clothing & Apparel';
                        if (categoryName === 'Furniture') categoryName = 'Home & Furniture';
                        return await callProductLookupAPI({ categoryName: categoryName });
                    }
                }
            }
        }

        // PRIORITY 3: Check for specific product names (online)
        if (responses.specific_products) {
            for (const productName of responses.specific_products) {
                if (levenshteinDistance(text, productName) <= 1) {
                    return await callProductLookupAPI({ productName: productName });
                }
            }
        }

        // PRIORITY 4: Check for product search triggers like "price of..." (online)
        if (responses.product_query) {
            for (const trigger of responses.product_query) {
                if (text.startsWith(trigger)) {
                    let productName = text.replace(trigger, '').trim();
                    const stopWords = ['a ', 'an ', 'the ', 'some '];
                    for (const word of stopWords) {
                        if (productName.startsWith(word)) { productName = productName.substring(word.length); break; }
                    }
                    if (productName) { return await callProductLookupAPI({ productName: productName }); }
                }
            }
        }
        
        // PRIORITY 5: Handle general offline queries (WHOLE WORD MATCH)
        // ⭐ THIS IS THE FIX. It now checks for whole words to prevent collisions.
        let bestMatch = { key: null, score: 0 };
        for (const key in responses) {
            if (key.startsWith("category_") || key === 'product_query' || key === 'specific_products') continue;
            for (const keyword of responses[key]) {
                // Use a regular expression with word boundaries (\b)
                const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                if (regex.test(text)) {
                    const score = keyword.length;
                    if (score > bestMatch.score) { bestMatch = { key: key, score: score }; }
                }
            }
        }
        if (bestMatch.key) { return answers[bestMatch.key]; }
        
        // PRIORITY 6: Fuzzy matching for general offline queries (Fallback)
        // This is intentionally left as a partial match for typos.
        const words = text.split(/\s+/);
        for (const key in responses) {
            if (key.startsWith("category_") || key === 'product_query' || key === 'specific_products') continue;
            for (const keyword of responses[key]) {
                for (const word of words) {
                    if (levenshteinDistance(word, keyword) <= (keyword.length > 5 ? 2 : 1)) { return answers[key]; }
                }
            }
        }
        
        return answers['help']; // Final fallback
    }

    // --- UI FUNCTIONS (No changes needed) ---
    function appendMessage(content, type) {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const wrapper = document.createElement('div');
        wrapper.classList.add('message-wrapper', `${type}-wrapper`);
        let messageText = (type === 'received' && typeof content === 'object') ? content.text : content;
        if (messageText === undefined) { messageText = "I'm not sure how to respond to that. Could you try asking in a different way?"; }
        let messageHTML = '';
        if (type === 'received') {
            messageHTML = `<div class="message-block"><div class="avatar"><i class="fa-solid fa-robot"></i></div><div class="message-content"><div class="message ${type}">${messageText}</div><div class="timestamp">${time}</div></div></div>`;
        } else {
            messageHTML = `<div class="message-content"><div class="message ${type}">${messageText}</div><div class="timestamp">${time}</div></div>`;
        }
        wrapper.innerHTML = messageHTML;
        chatMessages.appendChild(wrapper);

        if (type === 'received' && typeof content === 'object' && content.suggestions && content.suggestions.length > 0) {
            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'suggestions-container';
            content.suggestions.forEach(suggestionText => {
                const button = document.createElement('button');
                button.className = 'suggestion-chip';
                button.textContent = suggestionText;
                button.onclick = () => handleSend(suggestionText);
                suggestionsContainer.appendChild(button);
            });
            wrapper.appendChild(suggestionsContainer);
        }
        scrollToBottom();
    }

    function showTyping() {
        const wrapper = document.createElement('div');
        wrapper.classList.add('message-wrapper', 'received-wrapper', 'typing-indicator-wrapper');
        wrapper.innerHTML = `<div class="avatar"><i class="fa-solid fa-robot"></i></div><div class="typing-indicator"><span></span><span></span><span></span></div>`;
        chatMessages.appendChild(wrapper);
        scrollToBottom();
        return wrapper;
    }

    function scrollToBottom() { chatMessages.scrollTop = chatMessages.scrollHeight; }
    
    // --- MAIN HANDLER (No changes needed) ---
    async function handleSend(query) {
        const text = query.trim();
        if (!text) return;
        const oldSuggestions = document.querySelector('.suggestions-container');
        if (oldSuggestions) oldSuggestions.remove();
        appendMessage(text, 'sent');
        messageInput.value = '';
        logQueryToServer(text);
        const typingEl = showTyping();
        await new Promise(resolve => setTimeout(resolve, 1200)); 
        const replyObject = await getBotReply(text);
        typingEl.remove();
        appendMessage(replyObject, 'received');
    }
    
    // --- EVENT LISTENERS & INITIALIZATION (No changes needed) ---
    chatForm.addEventListener('submit', (e) => { e.preventDefault(); handleSend(messageInput.value); });
    
    function initializeChat() {
        appendMessage(answers['greetings'], 'received');
        messageInput.focus();
    }
    
    initializeChat();
});