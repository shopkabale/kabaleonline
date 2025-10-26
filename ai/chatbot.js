// File: /ai/chatbot.js - Final Streamlined Version (No Name-Asking)

document.addEventListener('DOMContentLoaded', function () {

  const MEMORY_KEY = 'kabale_memory_v4';
  const MAX_MEMORY = 30;

  const chatBody = document.getElementById('ko-body');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');

  function nowTime() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function safeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function load(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : []; } catch (e) { return []; } }
  function save(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.warn('save failed', e); } }
  function pushMemory(role, text) { const mem = load(MEMORY_KEY); mem.push({ role, text, time: new Date().toISOString() }); if (mem.length > MAX_MEMORY) mem.splice(0, mem.length - MAX_MEMORY); save(MEMORY_KEY, mem); }
  function capitalize(s) { if (!s) return ''; return s.charAt(0).toUpperCase() + s.slice(1); }

  function scrollToBottom() {
    if (chatBody) {
        chatBody.scrollTop = chatBody.scrollHeight;
    }
  }

  function appendMessage(content, type) {
    const time = nowTime();
    const wrapper = document.createElement('div');
    wrapper.classList.add('message-wrapper', `${type}-wrapper`);
    let text = (type === 'received' && typeof content === 'object') ? content.text : content;
    if (text === undefined) text = "I didn't catch that. Can you say it differently?";
    
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

  async function callProductLookupAPI(params) {
    try {
        const res = await fetch('/.netlify/functions/product-lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        if (!res.ok) {
            throw new Error('Server returned an error');
        }
        return await res.json();
    } catch (err) {
        console.error("Fatal: Lookup API fetch failed.", err);
        return { text: "Sorry, I'm having trouble connecting to the product database right now." };
    }
  }

  function logUnknownQuery(item) {
    fetch('/.netlify/functions/log-learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    }).catch(err => console.warn("Failed to log learning to server:", err));
  }

  async function generateReply(userText) {
    pushMemory('user', userText);
    const lc = userText.toLowerCase();

    // PRIORITY 1: Live Online Lookups
    for (const key in responses) {
        if (key.startsWith("category_")) {
            for (const keyword of responses[key]) {
                const regex = new RegExp(`\\b${safeRegex(keyword)}\\b`, 'i');
                if (regex.test(lc)) {
                    let categoryNameRaw = key.replace("category_", "");
                    let categoryName = capitalize(categoryNameRaw);
                    if (categoryName === 'Clothing') categoryName = 'Clothing & Apparel';
                    if (categoryName === 'Furniture') categoryName = 'Home & Furniture';
                    return await callProductLookupAPI({ categoryName: categoryName });
                }
            }
        }
    }
    const productTriggers = responses.product_query || ["price of", "cost of", "how much is"];
    for (const trigger of productTriggers) {
        if (lc.startsWith(trigger)) {
            let productName = userText.substring(trigger.length).trim();
            if (productName) {
                return await callProductLookupAPI({ productName: productName });
            }
        }
    }

    // PRIORITY 2: General Offline Keyword Queries
    let bestMatch = { key: null, score: 0 };
    for (const key in responses) {
      if (key.startsWith("category_") || key === 'product_query') continue;
      for (const keyword of responses[key]) {
        const regex = new RegExp(`\\b${safeRegex(keyword)}\\b`, 'i');
        if (regex.test(lc)) {
          const score = keyword.length;
          if (score > bestMatch.score) {
            bestMatch = { key, score };
          }
        }
      }
    }
    if (bestMatch.key && answers[bestMatch.key]) {
      return answers[bestMatch.key];
    }

    // PRIORITY 3: Final Fallback & Logging
    const clar = { text: "My apologies, my knowledge base is still growing...", suggestions: ["How to sell", "Find a hostel", "Is selling free?"] };
    logUnknownQuery({ type: 'unknown', question: userText, answer: clar.text });
    return clar;
  }

  chatForm.addEventListener('submit', async (e) => { e.preventDefault(); handleSend(messageInput.value); });

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
      pushMemory('bot', typeof reply === 'object' ? reply.text : reply);
    }
  }

  function initialize() {
    appendMessage(answers['greetings'], 'received');
    pushMemory('bot', answers['greetings'].text);
  }

  initialize();
});