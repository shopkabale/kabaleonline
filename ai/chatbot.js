// File: /ai/chatbot.js (The Definitive Version with Longest Match Logic)

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
    currentContext: null,
    lastResponseKey: null,
    lastResponseIndex: null,
    pendingAction: null,
    conversationState: null
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
  const normalizeWhatsAppNumber = (number) => { let cleaned = number.replace(/\s+/g, ''); if (cleaned.startsWith('0')) cleaned = '256' + cleaned.substring(1); if (!cleaned.startsWith('256')) cleaned = '256' + cleaned; return cleaned; };


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

  async function uploadImageToCloudinary(file) {
    try {
        const response = await fetch('/.netlify/functions/generate-signature');
        if (!response.ok) throw new Error('Failed to get signature.');
        const { signature, timestamp, cloudname, apikey } = await response.json();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apikey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudname}/image/upload`;
        const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: formData });
        if (!uploadResponse.ok) throw new Error('Cloudinary upload failed.');
        const uploadData = await uploadResponse.json();
        return uploadData.secure_url;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        throw error;
    }
  }

  async function uploadProductFromConversation(data) {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated.");
    try {
        const imageUrl = await uploadImageToCloudinary(data.file);
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};
        const productData = {
            listing_type: 'item', name: data.title, name_lowercase: data.title.toLowerCase(), price: Number(data.price), quantity: 1, category: data.category, description: data.description, story: "", whatsapp: normalizeWhatsAppNumber(data.whatsapp), sellerId: user.uid, sellerEmail: user.email, sellerName: userData.name || user.email, sellerIsVerified: userData.isVerified || false, sellerBadges: userData.badges || [], imageUrls: [imageUrl], createdAt: serverTimestamp(), isDeal: false, isSold: false
        };
        await addDoc(collection(db, 'products'), productData);
        if (userData.referrerId && !userData.referralValidationRequested) {
            const referrerDoc = await getDoc(doc(db, 'users', userData.referrerId));
            await addDoc(collection(db, "referralValidationRequests"), { referrerId: userData.referrerId, referrerEmail: referrerDoc.exists() ? referrerDoc.data().email : 'N/A', referredUserId: user.uid, referredUserName: userData.name, status: "pending", createdAt: serverTimestamp() });
            await updateDoc(userDocRef, { referralValidationRequested: true });
        }
        fetch('/.netlify/functions/syncToAlgolia').catch(err => console.error("Error triggering Algolia sync:", err));
        return true;
    } catch (error) {
        console.error("Error in uploadProductFromConversation:", error);
        return false;
    }
  }

  // --- Core Logic: NLP & Intent Detection ---
  const cleanSearchQuery = (text) => text.replace(/\b(a|an|the|is|are|one|some|for)\b/gi, '').replace(/\s\s+/g, ' ').trim();

  /**
   * **THE DEFINITIVE FIX: LONGEST MATCH LOGIC**
   * This function now finds the LONGEST, most specific keyword match in the user's sentence,
   * which permanently solves the keyword collision and punctuation bugs.
   */
  function detectIntent(userText) {
    const lc = userText.toLowerCase();
    const cleanText = lc.replace(/[^\w\s]/gi, ''); // Clean input to ignore punctuation

    if (sessionState.conversationState) return { intent: 'continue_conversation' };

    let bestMatch = { intent: 'unknown', length: 0 };

    // Iterate through ALL intents and keywords to find the longest match
    for (const intent in responses) {
      for (const keyword of (responses[intent] || [])) {
        if (cleanText.includes(keyword) && keyword.length > bestMatch.length) {
          bestMatch = { intent, length: keyword.length };
        }
      }
    }
    
    // Handle special trigger-based intents IF no strong keyword match was found
    if (bestMatch.length < 4) { // Heuristic: if best match is a short word, triggers might be better
        for (const trigger of (responses.product_query || [])) {
            if (cleanText.startsWith(trigger)) {
                const productName = cleanSearchQuery(userText.substring(trigger.length).trim());
                if (productName) {
                    saveSearchHistory(productName);
                    return { intent: 'search_product', entities: { productName } };
                }
            }
        }
        for (const trigger of (responses.glossary_query || [])) {
            if (cleanText.startsWith(trigger)) {
                const term = userText.substring(trigger.length).trim().replace(/['"`]/g, '').toLowerCase();
                if (term) return { intent: 'ask_glossary', entities: { term } };
            }
        }
    }
    
    // If a good match was found, use it. Otherwise, it remains 'unknown'.
    if (bestMatch.intent !== 'unknown') {
      // Re-map category intents to a single, dynamic intent
      if (bestMatch.intent.startsWith("category_")) {
        let categoryName = capitalize(bestMatch.intent.replace("category_", ""));
        if (categoryName === 'Clothing') categoryName = 'Clothing & Apparel';
        if (categoryName === 'Furniture') categoryName = 'Home & Furniture';
        return { intent: 'search_category', entities: { categoryName } };
      }
      return { intent: bestMatch.intent };
    }

    return { intent: 'unknown' };
  }

  // --- Core Logic: Conversation Handlers ---
  async function handleUploadConversation(userText) {
    const lc = userText.toLowerCase();
    const cleanText = lc.replace(/[^\w\s]/gi, '');
    if (responses.cancel.some(k => cleanText.includes(k))) {
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
            if (!/^07[0-9]{8}$/.test(userText)) return { text: "That doesn't look like a valid WhatsApp number. Please use the format 07..." };
            data.whatsapp = userText;
            sessionState.conversationState.step = 'get_photo';
            return { ...answers.upload_flow.get_whatsapp, action: 'prompt_upload' };
    }
  }

  async function generateReply(userText) {
    if (sessionState.conversationState) {
        return handleUploadConversation(userText);
    }
    
    if (sessionState.pendingAction) {
        const action = sessionState.pendingAction;
        sessionState.pendingAction = null; 

        if (action === 'confirm_upload') {
            const cleanText = userText.toLowerCase().replace(/[^\w\s]/gi, '');
            if (responses.affirmation.some(k => cleanText.includes(k))) {
                if (!isUserLoggedIn()) return answers.user_not_logged_in;
                sessionState.conversationState = { type: 'product_upload', step: 'get_title', data: {} };
                return answers.upload_flow.start; 
            } else {
                return answers.sell;
            }
        }
    }
    
    const { intent, entities } = detectIntent(userText);

    if (sessionState.currentContext?.type === 'search' && isSimpleNounQuery(userText.toLowerCase())) {
        const followUpIntent = detectIntent(userText);
        if (followUpIntent.intent === 'search_category') {
             sessionState.currentContext = { type: 'search', value: followUpIntent.entities.categoryName };
             return await callAPIFunction('product-lookup', { body: { categoryName: followUpIntent.entities.categoryName } });
        }
    }

    switch (intent) {
        case 'start_upload':
            if (!isUserLoggedIn()) return answers.user_not_logged_in;
            sessionState.pendingAction = 'confirm_upload';
            return answers.prompt_upload_conversation;
        
        case 'search_product':
            sessionState.currentContext = { type: 'search', value: entities.productName };
            return await callAPIFunction('product-lookup', { body: { productName: entities.productName } });

        case 'search_category':
            sessionState.currentContext = { type: 'search', value: entities.categoryName };
            return await callAPIFunction('product-lookup', { body: { categoryName: entities.categoryName } });
        
        case 'ask_glossary':
            const definition = answers.glossary[entities.term];
            if (definition) {
                return { text: `<b>${capitalize(entities.term)}:</b> ${definition}` };
            } else {
                return await callAPIFunction('web-search', { body: { query: userText } });
            }
        
        default:
            if (intent !== 'unknown' && answers[intent]) {
                sessionState.lastResponseKey = intent;
                const potentialReplies = answers[intent];
                let reply;
                if (Array.isArray(potentialReplies)) {
                    let nextIndex = Math.floor(Math.random() * potentialReplies.length);
                    reply = { ...potentialReplies[nextIndex] };
                } else {
                    reply = { ...potentialReplies };
                }

                if (proactiveSuggestions[intent]) {
                    reply.suggestions = reply.suggestions ? [...reply.suggestions] : [];
                    if (!reply.suggestions.includes(proactiveSuggestions[intent].text)) {
                      reply.suggestions.push(proactiveSuggestions[intent].text);
                    }
                }
                return reply;
            }

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
      if (file && sessionState.conversationState && sessionState.conversationState.type === 'product_upload') {
          appendMessage(`<i>Uploading ${file.name}...</i>`, 'sent');
          sessionState.conversationState.data.file = file;
          const finalData = sessionState.conversationState.data;
          sessionState.conversationState = null;
          
          const thinkingEl = showThinking();
          appendMessage(answers.upload_flow.get_photo, 'received');
          
          const success = await uploadProductFromConversation(finalData);
          
          thinkingEl.remove();
          appendMessage(success ? answers.upload_flow.finish_success : answers.upload_flow.finish_error, 'received');
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
      await new Promise(r => setTimeout(r, 600));
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