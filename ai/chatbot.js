// File: /ai/chatbot.js (The Upgraded & Refactored Version)

document.addEventListener('DOMContentLoaded', function () {
  // --- Firebase Sanity Check ---
  if (typeof auth === 'undefined' || typeof db === 'undefined' || typeof doc === 'undefined' || typeof getDoc === 'undefined' || typeof addDoc === 'undefined' || typeof collection === 'undefined' || typeof serverTimestamp === 'undefined' || typeof updateDoc === 'undefined') {
    console.error("Amara AI FATAL ERROR: Firebase v9 objects are not globally available. The script cannot run.");
    return;
  }

  // --- Constants and Configuration ---
  const SESSION_STATE_KEY = 'kabale_session_state_v1';
  const SEARCH_HISTORY_KEY = 'kabale_search_history_v1';
  const GOOGLE_FORM_ACTION_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeSg2kFpCm1Ei4gXgNH9zB_p8tuEpeBcIP9ZkKjIDQg8IHnMg/formResponse";
  const USER_MESSAGE_ENTRY_ID = "entry.779723602";
  const RESPONSE_GIVEN_ENTRY_ID = "entry.2015145894";
  const PROMOTIONAL_MESSAGE = "This week, enjoy featured listings for all hostel rooms!";
  
  /**
   * UPGRADE: Proactive suggestions map. When Amara answers an intent, she can suggest a related topic.
   */
  const proactiveSuggestions = {
    'sell': { text: 'Tips for good photos', intent: 'photo_tips' },
    'buy': { text: 'How to buy safely', intent: 'user_safety' },
    'rent': { text: 'How to buy safely', intent: 'user_safety' }
  };

  // --- DOM Element References ---
  const chatBody = document.getElementById('ko-body');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');
  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  // --- Session State Management ---
  let sessionState = {
    userName: null,
    currentContext: null, // Tracks the last major action (e.g., {type: 'search', value: 'laptops'})
    lastResponseKey: null,
    lastResponseIndex: null,
    pendingAction: null,
    conversationState: null // For multi-step flows like product uploads
  };
  let exitIntentTriggered = false;

  // --- Utility Functions ---
  const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const safeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  const isUserLoggedIn = () => auth.currentUser;
  const scrollToBottom = () => { if (chatBody) chatBody.scrollTop = chatBody.scrollHeight; };
  const loadState = () => { try { const s = localStorage.getItem(SESSION_STATE_KEY); if (s) sessionState.userName = JSON.parse(s).userName || null; } catch (e) { } };
  const saveState = () => { try { localStorage.setItem(SESSION_STATE_KEY, JSON.stringify({ userName: sessionState.userName })); } catch (e) { } };
  const getSearchHistory = () => { try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || []; } catch { return []; } };
  const saveSearchHistory = (term) => { let h = getSearchHistory(); if (!h.includes(term)) { h.unshift(term); localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(h.slice(0, 3))); } };
  const isSimpleNounQuery = (text) => text.split(' ').length <= 2 && !['what', 'how', 'who', 'when', 'is', 'can'].includes(text.split(' ')[0]);


  // --- UI Functions ---
  const showThinking = () => { const w = document.createElement('div'); w.className = 'message-wrapper received-wrapper thinking-indicator-wrapper'; w.innerHTML = `<div class="avatar"><i class="fa-solid fa-robot"></i></div><div class="thinking-indicator"><i class="fa-solid fa-gear"></i> Thinking...</div>`; chatMessages.appendChild(w); scrollToBottom(); return w; };
  const showTyping = () => { const w = document.createElement('div'); w.className = 'message-wrapper received-wrapper typing-indicator-wrapper'; w.innerHTML = `<div class="avatar"><i class="fa-solid fa-robot"></i></div><div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`; chatMessages.appendChild(w); scrollToBottom(); return w; };

  function appendMessage(content, type) {
    const time = nowTime();
    const wrapper = document.createElement('div');
    wrapper.classList.add('message-wrapper', `${type}-wrapper`);
    let text = (type === 'received' && typeof content === 'object') ? content.text : content;
    if (text === undefined) text = "I didn't quite understand that. Could you try asking in a different way?";
    if (sessionState.userName) text = text.replace(/\${userName}/g, sessionState.userName);
    
    wrapper.innerHTML = (type === 'received')
      ? `<div class="message-block"><div class="avatar"><i class="fa-solid fa-robot"></i></div><div class="message-content"><div class="message received">${text}</div><div class="timestamp">${time}</div></div></div>`
      : `<div class="message-content"><div class="message sent">${text}</div><div class="timestamp">${time}</div></div>`;
    
    chatMessages.appendChild(wrapper);

    if (type === 'received' && typeof content === 'object' && content.suggestions?.length) {
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

  function createActionButton(text, onClick) {
    const sc = document.createElement('div');
    sc.className = 'suggestions-container';
    const b = document.createElement('button');
    b.className = 'suggestion-chip';
    b.textContent = text;
    b.onclick = onClick;
    sc.appendChild(b);
    chatMessages.lastChild.appendChild(sc);
  }

  // --- Core Logic: Backend & APIs ---
  async function callAPIFunction(endpoint, { body, token } = {}) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/.netlify/functions/${endpoint}`, {
        method: 'POST',
        headers: headers,
        body: body ? JSON.stringify(body) : null
      });
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`API call to '${endpoint}' failed:`, err);
      return { text: "Sorry, I'm having trouble connecting to my services right now. Please try again in a moment." };
    }
  }

  function logUnknownQuery(item) {
    const queryParams = new URLSearchParams({ [USER_MESSAGE_ENTRY_ID]: item.question, [RESPONSE_GIVEN_ENTRY_ID]: item.answer });
    navigator.sendBeacon(`${GOOGLE_FORM_ACTION_URL}?${queryParams.toString()}`);
  }

  // --- Core Logic: NLP & Intent Detection ---
  const cleanSearchQuery = (text) => text.replace(/\b(a|an|the|is|are|one|some|for)\b/gi, '').replace(/\s\s+/g, ' ').trim();

  /**
   * UPGRADE: This function is now more accurate. It prioritizes exact matches over keyword matches.
   */
  function detectIntent(userText) {
    const lc = userText.toLowerCase();

    // Priority 0: Active multi-step conversation
    if (sessionState.conversationState) return { intent: 'continue_conversation' };

    // Priority 1: High-specificity, exact phrase matching
    for (const intent in responses) {
      for (const keyword of responses[intent]) {
        if (lc === keyword) return { intent };
      }
    }

    // Priority 2: Keyword-based intent matching
    for (const intent in responses) {
      if (['product_query', 'glossary_query'].includes(intent)) continue; // Handled separately
      for (const keyword of responses[intent]) {
        if (new RegExp(`\\b${safeRegex(keyword)}\\b`, 'i').test(lc)) return { intent };
      }
    }
    
    // Priority 3: Trigger-based intents (search, glossary, etc.)
    for (const trigger of responses.product_query) {
      if (lc.startsWith(trigger)) {
        const productName = cleanSearchQuery(userText.substring(trigger.length).trim());
        if (productName) { saveSearchHistory(productName); return { intent: 'search_product', entities: { productName } }; }
      }
    }
    for (const trigger of responses.glossary_query) {
      if (lc.startsWith(trigger)) {
        const term = userText.substring(trigger.length).trim().replace(/['"`]/g, '').toLowerCase();
        if (term) return { intent: 'ask_glossary', entities: { term } };
      }
    }

    return { intent: 'unknown' };
  }


  /**
   * UPGRADE: The entire product upload flow is now self-contained in this function.
   * This cleans up the main generateReply function significantly.
   */
  async function handleUploadConversation(userText) {
    const lc = userText.toLowerCase();
    if (responses.cancel.some(k => lc.includes(k))) {
        sessionState.conversationState = null;
        return answers.conversation_cancelled;
    }

    const { step, data } = sessionState.conversationState;
    switch (step) {
        case 'get_title':
            data.title = userText;
            sessionState.conversationState.step = 'get_description';
            return answers.upload_flow.get_title;
        case 'get_description':
            data.description = userText;
            sessionState.conversationState.step = 'get_price';
            return answers.upload_flow.get_description;
        case 'get_price':
            const price = parseInt(userText.replace(/,/g, ''));
            if (isNaN(price) || price <= 0) return { text: "That doesn't seem like a valid price. Please enter a positive number, like 50000." };
            data.price = price;
            sessionState.conversationState.step = 'get_category';
            return answers.upload_flow.get_price;
        case 'get_category':
            data.category = userText;
            sessionState.conversationState.step = 'get_whatsapp';
            return answers.upload_flow.get_category;
        case 'get_whatsapp':
            // Basic validation for a Ugandan number
            if (!/^07[0-9]{8}$/.test(userText)) return { text: "That doesn't look like a valid WhatsApp number. Please use the format 07..." };
            data.whatsapp = userText;
            sessionState.conversationState.step = 'get_photo';
            return { ...answers.upload_flow.get_whatsapp, action: 'prompt_upload' };
    }
  }


  /**
   * Main function to process user input and generate a response.
   */
  async function generateReply(userText) {
    // If a multi-step conversation is active, delegate to its handler.
    if (sessionState.conversationState) {
        return handleUploadConversation(userText);
    }
    
    const { intent, entities } = detectIntent(userText);

    // Handle pending actions (like confirming the conversational upload)
    if (sessionState.pendingAction) {
        const action = sessionState.pendingAction;
        sessionState.pendingAction = null;
        if (action === 'confirm_upload') {
            if (intent === 'affirmation') {
                if (!isUserLoggedIn()) return answers.user_not_logged_in;
                sessionState.conversationState = { type: 'product_upload', step: 'get_title', data: {} };
                return answers.upload_flow.start;
            } else {
                return answers.sell;
            }
        }
    }

    /**
     * UPGRADE: Smarter contextual follow-up. If the last action was a search,
     * a simple noun query is treated as a new search.
     */
    if (sessionState.currentContext?.type === 'search' && isSimpleNounQuery(userText.toLowerCase())) {
        sessionState.currentContext = { type: 'search', value: userText };
        return await callAPIFunction('product-lookup', { body: { productName: userText } });
    }

    switch (intent) {
        case 'start_upload':
            if (!isUserLoggedIn()) return answers.user_not_logged_in;
            sessionState.pendingAction = 'confirm_upload';
            return answers.prompt_upload_conversation;
        
        case 'search_product':
            sessionState.currentContext = { type: 'search', value: entities.productName };
            return await callAPIFunction('product-lookup', { body: { productName: entities.productName } });
        
        case 'ask_glossary':
            const definition = answers.glossary[entities.term];
            return definition ? { text: `<b>${capitalize(entities.term)}:</b> ${definition}` } : answers.glossary_not_found;
        
        default:
            // Standard reply from answers.js
            if (intent !== 'unknown' && answers[intent]) {
                sessionState.lastResponseKey = intent;
                const potentialReplies = answers[intent];
                let reply;
                if (Array.isArray(potentialReplies)) {
                    let nextIndex = Math.floor(Math.random() * potentialReplies.length);
                    reply = potentialReplies[nextIndex];
                } else {
                    reply = potentialReplies;
                }

                // UPGRADE: Add proactive suggestions if one exists for this intent
                if (proactiveSuggestions[intent]) {
                    reply.suggestions = reply.suggestions || [];
                    reply.suggestions.push(proactiveSuggestions[intent].text);
                }
                return reply;
            }

            // --- Smart Fallback: Log and search the web ---
            logUnknownQuery({ question: userText, answer: 'Internal knowledge not found. Attempting web search.' });
            const isWorthSearching = userText.split(' ').length > 1 || userText.length > 8;

            if (isWorthSearching) {
                sessionState.currentContext = { type: 'web_search', value: userText };
                return await callAPIFunction('web-search', { body: { query: userText } });
            } else {
                return { text: `I'm not sure how to help with that. Could you ask a more specific question?`, suggestions: ["Help", "How to sell", "Find a hostel"] };
            }
    }
  }


  // --- Initialization and Event Handlers ---
  function initialize() {
    loadState();
    let initialGreeting;
    const hour = new Date().getHours();
    
    if (hour < 12) initialGreeting = { text: "☀️ Good morning! I'm Amara. How can I help you get started?" };
    else if (hour < 18) initialGreeting = { text: "👋 Good afternoon! I'm Amara, ready to help you find or sell." };
    else initialGreeting = { text: "🌙 Good evening! I'm Amara. What can I assist you with?" };
    
    initialGreeting.suggestions = answers.greetings[0].suggestions;
    
    if (PROMOTIONAL_MESSAGE) {
      initialGreeting.text = `<b>${PROMOTIONAL_MESSAGE}</b><br><br>${initialGreeting.text}`;
    }
    appendMessage(initialGreeting, 'received');
  }

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && sessionState.conversationState?.type === 'product_upload') {
        appendMessage(`<i>Uploading ${file.name}... this may take a moment.</i>`, 'sent');
        const finalData = { ...sessionState.conversationState.data, file };
        sessionState.conversationState = null; // Clear state early

        const thinkingEl = showThinking();
        try {
            const imageUrl = await uploadImageToCloudinary(file); // Assume this function exists and is robust
            const productData = { ...finalData, imageUrls: [imageUrl] }; // Re-structure as needed
            const success = await saveProductToFirebase(productData); // Assume this function exists
            thinkingEl.remove();
            appendMessage(success ? answers.upload_flow.finish_success : answers.upload_flow.finish_error, 'received');
        } catch (error) {
            console.error("Upload process failed:", error);
            thinkingEl.remove();
            appendMessage(answers.upload_flow.finish_error, 'received');
        }
    }
  });

  document.addEventListener('mouseleave', (e) => {
      if (e.clientY <= 0 && !exitIntentTriggered) {
          exitIntentTriggered = true;
          if (chatMessages.children.length <= 2) { appendMessage(answers.exit_intent, 'received'); }
      }
  });

  async function handleSend(rawText) {
    const text = (rawText || '').trim();
    if (!text) return;
    document.querySelector('.suggestions-container')?.remove();
    appendMessage(text, 'sent');
    messageInput.value = '';
    const thinkingEl = showThinking();
    const reply = await generateReply(text);
    thinkingEl.remove();
    if (reply) {
      const typingEl = showTyping();
      await new Promise(r => setTimeout(r, 600)); // Simulate typing delay
      typingEl.remove();
      appendMessage(reply, 'received');
      if (reply.action === 'prompt_upload') {
        createActionButton("Click to Upload Photo", () => fileInput.click());
      }
    }
  }

  chatForm.addEventListener('submit', (e) => { e.preventDefault(); handleSend(messageInput.value); });

  // Start the chatbot
  initialize();
});