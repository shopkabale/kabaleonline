// File: /ai/chatbot.js - "SMARTER AMARA" FINAL VERSION WITH ALL FEATURES

document.addEventListener('DOMContentLoaded', function () {
  // --- Core State Management & Memory Keys ---
  const SESSION_STATE_KEY = 'kabale_session_state_v1';

  // --- Google Form codes for logging unknown queries ---
  const GOOGLE_FORM_ACTION_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeSg2kFpCm1Ei4gXgNH9zB_p8tuEpeBcIP9ZkKjIDQg8IHnMg/formResponse";
  const USER_MESSAGE_ENTRY_ID = "entry.779723602";
  const RESPONSE_GIVEN_ENTRY_ID = "entry.2015145894";

  // --- DOM Element References ---
  const chatBody = document.getElementById('ko-body');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');

  // --- The bot's "brain" or memory ---
  let sessionState = {
    userName: null,
    currentContext: null,
    lastResponseKey: null,
    pendingQuestion: false // ⭐ NEW: Tracks if Amara just asked a yes/no question
  };

  // --- Utility Functions ---
  function nowTime() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function safeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function capitalize(s) { if (!s) return ''; return s.charAt(0).toUpperCase() + s.slice(1); }

  function loadState() {
      try {
          const storedState = localStorage.getItem(SESSION_STATE_KEY);
          if (storedState) {
              const parsedState = JSON.parse(storedState);
              sessionState.userName = parsedState.userName || null;
          }
      } catch (e) { console.warn('Could not load state.', e); }
  }

  function saveState() {
      try {
          const stateToSave = { userName: sessionState.userName };
          localStorage.setItem(SESSION_STATE_KEY, JSON.stringify(stateToSave));
      } catch (e) { console.warn('Could not save state.', e); }
  }

  // --- UI Rendering Functions ---
  function scrollToBottom() {
    if (chatBody) { chatBody.scrollTop = chatBody.scrollHeight; }
  }

  function appendMessage(content, type) {
    const time = nowTime();
    const wrapper = document.createElement('div');
    wrapper.classList.add('message-wrapper', `${type}-wrapper`);
    let text = (type === 'received' && typeof content === 'object') ? content.text : content;
    if (text === undefined) text = "I didn't catch that. Can you say it differently?";

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

  // --- Backend API and Logging ---
  async function callProductLookupAPI(params) {
    sessionState.currentContext = params.categoryName ? { type: 'category', value: params.categoryName } : { type: 'product', value: params.productName };
    try {
        const res = await fetch('/.netlify/functions/product-lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
        if (!res.ok) throw new Error('Server returned an error');
        return await res.json();
    } catch (err) {
        console.error("Fatal: Lookup API fetch failed.", err);
        return { text: "Sorry, I'm having trouble connecting to the product database right now." };
    }
  }

  function logUnknownQuery(item) {
    const queryParams = new URLSearchParams({ [USER_MESSAGE_ENTRY_ID]: item.question, [RESPONSE_GIVEN_ENTRY_ID]: item.answer });
    const submitUrl = `${GOOGLE_FORM_ACTION_URL}?${queryParams.toString()}`;
    const img = new Image();
    img.src = submitUrl;
  }

  // --- Intelligence Layer ---
  function cleanSearchQuery(text) {
      const stopWords = ['a', 'an', 'the', 'is', 'are', 'one', 'some', 'for'];
      const regex = new RegExp(`\\b(${stopWords.join('|')})\\b`, 'gi');
      return text.replace(regex, '').replace(/\s\s+/g, ' ').trim();
  }

  function detectIntent(userText) {
      const lc = userText.toLowerCase();

      // ⭐ NEW: Price Check Reasoning Regex
      const priceMatch = lc.match(/(?:is|price of)\s+([\d,]+(?:,\d{3})*)\s+(too high|too low|a good price|fair)/);
      if (priceMatch && priceMatch[1]) {
          const price = parseInt(priceMatch[1].replace(/,/g, ''));
          return { intent: 'price_check', entities: { price } };
      }
      
      const nameMatch = lc.match(/^(?:my name is|call me|i'm|i am|am)\s+([a-zA-Z]+)\s*$/);
      if (nameMatch && nameMatch[1]) {
          return { intent: 'set_name', entities: { name: capitalize(nameMatch[1]) } };
      }

      // ⭐ NEW: Expanded Core Actions
      const coreActionKeys = ['sell', 'buy', 'rent', 'help', 'contact', 'after_upload', 'after_delivery'];
      for (const key of coreActionKeys) {
          const keywords = responses[key] || [];
          for (const keyword of keywords) {
              if (new RegExp(`\\b${safeRegex(keyword)}\\b`, 'i').test(lc)) {
                  return { intent: key };
              }
          }
      }

      const productTriggers = responses.product_query || [];
      for (const trigger of productTriggers) {
          if (lc.startsWith(trigger)) {
              let productName = cleanSearchQuery(userText.substring(trigger.length).trim());
              if (productName) return { intent: 'search_product', entities: { productName } };
          }
      }

      for (const key in responses) {
          if (key.startsWith("category_")) {
              for (const keyword of responses[key]) {
                  if (new RegExp(`\\b${safeRegex(keyword)}\\b`, 'i').test(lc)) {
                      let categoryName = capitalize(key.replace("category_", ""));
                      if (categoryName === 'Clothing') categoryName = 'Clothing & Apparel';
                      if (categoryName === 'Furniture') categoryName = 'Home & Furniture';
                      return { intent: 'search_category', entities: { categoryName } };
                  }
              }
          }
      }

      let bestMatch = { key: null };
      for (const key in responses) {
          if (coreActionKeys.includes(key) || key.startsWith("category_") || key === 'product_query') continue;
          for (const keyword of responses[key]) {
              if (new RegExp(`\\b${safeRegex(keyword)}\\b`, 'i').test(lc)) {
                  bestMatch.key = key;
              }
          }
      }
      if (bestMatch.key) return { intent: bestMatch.key };
      
      return { intent: 'unknown' };
  }

  // --- Main Reply Generator ---
  async function generateReply(userText) {
      const { intent, entities } = detectIntent(userText);

      // ⭐ NEW: PRIORITY 1: Handle direct replies to pending questions
      if (sessionState.pendingQuestion) {
          if (intent === 'affirmation') {
              sessionState.pendingQuestion = false;
              return answers.affirmation;
          }
          if (intent === 'negation') {
              sessionState.pendingQuestion = false;
              return answers.negation;
          }
      }
      // If it's not a direct yes/no, reset the flag
      sessionState.pendingQuestion = false;
      
      // PRIORITY 2: Handle contextual follow-ups
      const lc = userText.toLowerCase();
      const followUpPhrases = ["what about", "how about", "and for", "are there any", "do you have any"];
      if (sessionState.currentContext && followUpPhrases.some(p => lc.startsWith(p))) {
          let newKeywordsRaw = userText.replace(new RegExp(`^(${followUpPhrases.join('|')})\\s*`, 'i'), '').trim();
          let newKeywords = cleanSearchQuery(newKeywordsRaw);
          let contextValue = cleanSearchQuery(sessionState.currentContext.value);
          let combinedQuery = `${newKeywords} ${contextValue}`;
          return await callProductLookupAPI({ productName: combinedQuery });
      }
      sessionState.currentContext = null;

      // PRIORITY 3: Handle all other intents
      // 1. Handle special intents with unique actions first
      if (intent === 'set_name') {
          sessionState.userName = entities.name;
          saveState();
          return answers.confirm_name_set;
      }
      if (intent === 'search_product') {
          return await callProductLookupAPI({ productName: entities.productName });
      }
      if (intent === 'search_category') {
          return await callProductLookupAPI({ categoryName: entities.categoryName });
      }
      if (intent === 'price_check') {
          const price = entities.price; 
          let responseText = `Regarding a price of UGX ${price.toLocaleString()}:<br>`; 
          if (price > 1000000) { 
              responseText += "That's a high-ticket item! For this value, I'd recommend meeting the seller in a very public place and verifying everything carefully before paying."; 
          } else if (price > 200000) { 
              responseText += "That's a significant amount, likely for a quality item like a smartphone or laptop. Be sure to inspect it thoroughly."; 
          } else if (price < 20000) { 
              responseText += "That seems like a great deal! Just make sure the item's condition matches the description."; 
          } else { 
              responseText += "That seems like a pretty standard price for many items here. The value depends on the item's condition and brand."; 
          } 
          return { text: responseText, suggestions: ["Safety tips", "How do I buy?", "Find me a laptop"] };
      }

      // 2. Handle ANY other known intent from your responses.js file
      if (intent !== 'unknown' && answers[intent]) {
          if (intent === sessionState.lastResponseKey) {
              return { text: "We just talked about that. Is there something specific I can clarify?", suggestions: ["Help", "Contact support"] };
          }
          sessionState.lastResponseKey = intent;
          
          // ⭐ NEW: Hyper-Varied Response Logic
          const potentialReplies = answers[intent];
          let reply;
          if (Array.isArray(potentialReplies)) {
              // If the response is an array, pick a random one.
              const randomIndex = Math.floor(Math.random() * potentialReplies.length);
              reply = potentialReplies[randomIndex];
          } else {
              // Otherwise, return the single response object.
              reply = potentialReplies;
          }

          // ⭐ NEW: Check if the chosen reply is a question to set the pending state
          if (reply.text && reply.text.includes('?')) {
              sessionState.pendingQuestion = true;
          }
          return reply;
      }

      // 3. If the intent is still unknown, provide the fallback
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
    document.querySelector('.suggestions-container')?.remove();
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
    loadState();
    let initialGreeting;
    
    // ⭐ NEW: Time-Aware Greeting Logic
    const hour = new Date().getHours();
    let timeBasedText;
    if (hour < 12) { 
        timeBasedText = "☀️ Good morning! I'm Amara. How can I help you get a great start to your day?"; 
    } else if (hour < 18) { 
        timeBasedText = "👋 Good afternoon! I'm Amara, ready to help you find what you need."; 
    } else { 
        timeBasedText = "🌙 Good evening! Doing some late-night browsing? I'm Amara, and I can help with that!"; 
    }
    
    const greetingOptions = Array.isArray(answers.greetings) ? answers.greetings[0] : answers.greetings;
    
    if (sessionState.userName) { 
        initialGreeting = { text: `👋 Welcome back, ${sessionState.userName}! How can I help you today?`, suggestions: greetingOptions.suggestions }; 
    } else { 
        initialGreeting = { text: timeBasedText, suggestions: greetingOptions.suggestions }; 
    }

    appendMessage(initialGreeting, 'received');
    sessionState.lastResponseKey = 'greetings';
    if (initialGreeting.text.includes('?')) {
        sessionState.pendingQuestion = true;
    }
  }
  
  initialize();
});