// File: /ai/chatbot.js - "SMARTER AMARA" UPGRADE

document.addEventListener('DOMContentLoaded', function () {

  // --- Core State Management & Memory Keys ---
  const SESSION_STATE_KEY = 'kabale_session_state_v1';
  const MAX_MEMORY = 30; // Still used for conversation logging, separate from state

  // --- Your unique Google Form codes (No change needed) ---
  const GOOGLE_FORM_ACTION_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeSg2kFpCm1Ei4gXgNH9zB_p8tuEpeBcIP9ZkKjIDQg8IHnMg/formResponse";
  const USER_MESSAGE_ENTRY_ID = "entry.779723602";
  const RESPONSE_GIVEN_ENTRY_ID = "entry.2015145894";
  // ---------------------------------------------------------

  const chatBody = document.getElementById('ko-body');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');
  
  // --- Session State: The heart of the new intelligence ---
  let sessionState = {
    userName: null,
    currentContext: null, // e.g., { type: 'category', value: 'Laptops' }
    lastResponseKey: null,
  };

  // --- Utility Functions (with additions) ---
  function nowTime() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function safeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function capitalize(s) { if (!s) return ''; return s.charAt(0).toUpperCase() + s.slice(1); }
  function pushMemory(role, text) { /* This function remains for logging, but not for context */ }

  function loadState() {
      try {
          const storedState = localStorage.getItem(SESSION_STATE_KEY);
          if (storedState) {
              const parsedState = JSON.parse(storedState);
              sessionState.userName = parsedState.userName || null;
          }
      } catch (e) {
          console.warn('Could not load session state.', e);
      }
  }

  function saveState() {
      try {
          const stateToSave = { userName: sessionState.userName };
          localStorage.setItem(SESSION_STATE_KEY, JSON.stringify(stateToSave));
      } catch (e) {
          console.warn('Could not save session state.', e);
      }
  }

  // --- UI Functions (with personalization) ---
  function scrollToBottom() {
    if (chatBody) { chatBody.scrollTop = chatBody.scrollHeight; }
  }

  function appendMessage(content, type) {
    const time = nowTime();
    const wrapper = document.createElement('div');
    wrapper.classList.add('message-wrapper', `${type}-wrapper`);
    let text = (type === 'received' && typeof content === 'object') ? content.text : content;
    if (text === undefined) text = "I didn't catch that. Can you say it differently?";

    // ⭐ PERSONALIZATION: Inject user's name if available
    if (sessionState.userName) {
        text = text.replace(/\${userName}/g, sessionState.userName);
    }

    let html = '';
    if (type === 'received') {
      html = `<div class="message-block"><div class="avatar"><i class="fa-solid fa-robot"></i></div><div class="message-content"><div class="message received">${text}</div><div class="timestamp">${time}</div></div></div>`;
    } else {
      html = `<div class="message-content"><div class="message sent">${text}</div><div class="timestamp">${time}</div></div>`;
    }
    wrapper.innerHTML = html;
    chatMessages.appendChild(wrapper);

    if (type === 'received' && typeof content === 'object' && content.suggestions && content.suggestions.length) {
      const sc = document.createElement('div');
      sc.className = 'suggestions-container';
      content.suggestions.forEach(s => {
        const b = document.createElement('button');
        b.className = 'suggestion-chip';
        b.textContent = s;
        b.onclick = () => handleSend(s);
        sc.appendChild(b);
      });
      wrapper.appendChild(sc);
    }
    scrollToBottom();
  }
  
  function showThinking() {
    const wrapper = document.createElement('div');
    wrapper.classList.add('message-wrapper', 'received-wrapper', 'thinking-indicator-wrapper');
    wrapper.innerHTML = `<div class="avatar"><i class="fa-solid fa-robot"></i></div><div class="thinking-indicator"><i class="fa-solid fa-gear"></i> Thinking...</div>`;
    chatMessages.appendChild(wrapper);
    scrollToBottom();
    return wrapper;
  }

  function showTyping() {
    const wrapper = document.createElement('div');
    wrapper.classList.add('message-wrapper', 'received-wrapper', 'typing-indicator-wrapper');
    wrapper.innerHTML = `<div class="avatar"><i class="fa-solid fa-robot"></i></div><div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
    chatMessages.appendChild(wrapper);
    scrollToBottom();
    return wrapper;
  }

  // --- API and Logging (No change needed) ---
  async function callProductLookupAPI(params) {
    // ⭐ CONTEXT: Set the context after a successful API call
    if (params.categoryName) {
        sessionState.currentContext = { type: 'category', value: params.categoryName };
    } else if (params.productName) {
        sessionState.currentContext = { type: 'product', value: params.productName };
    }

    try {
        const res = await fetch('/.netlify/functions/product-lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        if (!res.ok) throw new Error('Server returned an error');
        return await res.json();
    } catch (err) {
        console.error("Fatal: Lookup API fetch failed.", err);
        return { text: "Sorry, I'm having trouble connecting to the product database right now." };
    }
  }
  
  function logUnknownQuery(item) {
    const queryParams = new URLSearchParams({
        [USER_MESSAGE_ENTRY_ID]: item.question,
        [RESPONSE_GIVEN_ENTRY_ID]: item.answer
    });
    const submitUrl = `${GOOGLE_FORM_ACTION_URL}?${queryParams.toString()}`;
    const img = new Image();
    img.src = submitUrl;
  }
  
  // --- ⭐ NEW: Intelligence Layer ---
  function parseUserInput(text) {
      const lc = text.toLowerCase();
      const entities = {
          product: null,
          category: null,
          modifiers: []
      };
      
      // Simple modifier check
      if (/\b(cheap|affordable|low price)\b/.test(lc)) entities.modifiers.push('cheap');
      if (/\b(new|brand new)\b/.test(lc)) entities.modifiers.push('new');
      if (/\b(used|second hand)\b/.test(lc)) entities.modifiers.push('used');
      
      return entities;
  }


  // --- ⭐ OVERHAULED: Main Reply Generation Logic ---
  async function generateReply(userText) {
    const lc = userText.toLowerCase();

    // PRIORITY 1: Personalization Commands
    const nameMatch = lc.match(/^(?:my name is|call me)\s+([a-zA-Z]+)\s*$/);
    if (nameMatch && nameMatch[1]) {
        sessionState.userName = capitalize(nameMatch[1]);
        saveState();
        return answers.confirm_name_set; // Assuming you add this to answers.js
    }
    
    // PRIORITY 2: Contextual Follow-up Questions
const followUpPhrases = ["what about", "how about", "and for", "are there any", "do you have any"];
if (sessionState.currentContext && followUpPhrases.some(p => lc.startsWith(p))) {
    // 1. Clean the follow-up phrase to get the new keywords.
    // E.g., "what about a new one" becomes "a new one"
    let newKeywords = userText.replace(new RegExp(`^(${followUpPhrases.join('|')})\\s*`, 'i'), '').trim();

    // 2. Combine the new keywords with the saved context.
    // E.g., "a new one" + "phone" becomes "new phone"
    let combinedQuery = `${newKeywords} ${sessionState.currentContext.value}`;

    console.log(`Contextual Search Triggered: "${combinedQuery}"`); // For your debugging

    // 3. Run a new live search with the combined query.
    return await callProductLookupAPI({ productName: combinedQuery });
}
    
    // Reset context if it's a new, unrelated query
    sessionState.currentContext = null;

    // PRIORITY 3: Live Online Lookups (with Entity parsing)
    for (const key in responses) {
        if (key.startsWith("category_")) {
            for (const keyword of responses[key]) {
                if (new RegExp(`\\b${safeRegex(keyword)}\\b`, 'i').test(lc)) {
                    let categoryNameRaw = key.replace("category_", "");
                    let categoryName = capitalize(categoryNameRaw);
                    if (categoryName === 'Clothing') categoryName = 'Clothing & Apparel';
                    if (categoryName === 'Furniture') categoryName = 'Home & Furniture';
                    return await callProductLookupAPI({ categoryName: categoryName });
                }
            }
        }
    }
    const productTriggers = responses.product_query || [];
    for (const trigger of productTriggers) {
        if (lc.startsWith(trigger)) {
            let productName = userText.substring(trigger.length).trim();
            if (productName) return await callProductLookupAPI({ productName: productName });
        }
    }

    // PRIORITY 4: General Offline Keyword Queries
    let bestMatch = { key: null, score: 0 };
    for (const key in responses) {
      if (key.startsWith("category_") || key === 'product_query') continue;
      for (const keyword of responses[key]) {
        if (new RegExp(`\\b${safeRegex(keyword)}\\b`, 'i').test(lc)) {
          const score = keyword.length;
          if (score > bestMatch.score) { bestMatch = { key, score }; }
        }
      }
    }
    if (bestMatch.key) {
        // ⭐ REPETITION HANDLING: Check if we are about to repeat ourselves
        if (bestMatch.key === sessionState.lastResponseKey) {
            return { text: "We just talked about that. Is there something specific I can clarify?", suggestions: ["Help", "Contact support"] };
        }
        sessionState.lastResponseKey = bestMatch.key;
        if (answers[bestMatch.key]) return answers[bestMatch.key];
    }
    
    // PRIORITY 5: Final Fallback & Logging
    sessionState.lastResponseKey = 'fallback';
    const fallbackResponse = { text: `I'm still learning and don't have information on that yet. You can try asking differently.`, suggestions: ["How to sell", "Find a hostel", "Is selling free?"] };
    logUnknownQuery({ question: userText, answer: fallbackResponse.text });
    return fallbackResponse;
  }

  // --- Event Handling and Initialization ---
  chatForm.addEventListener('submit', (e) => { e.preventDefault(); handleSend(messageInput.value); });

  async function handleSend(raw) {
    const text = (raw || '').trim();
    if (!text) return;
    const oldSuggestions = document.querySelector('.suggestions-container');
    if (oldSuggestions) oldSuggestions.remove();
    appendMessage(text, 'sent');
    messageInput.value = '';
    const thinkingEl = showThinking();
    const reply = await generateReply(text);
    thinkingEl.remove();
    if (reply) {
      const typingEl = showTyping();
      await new Promise(r => setTimeout(r, 700));
      typingEl.remove();
      appendMessage(reply, 'received');
    }
  }

  function initialize() {
    loadState(); // Load the user's name
    let initialGreeting = answers['greetings'];
    if (sessionState.userName) {
        // Create a personalized welcome back message
        initialGreeting = {
            text: `👋 Welcome back, ${sessionState.userName}! How can I help you today?`,
            suggestions: answers['greetings'].suggestions
        };
    }
    appendMessage(initialGreeting, 'received');
    sessionState.lastResponseKey = 'greetings';
  }

  initialize();
});