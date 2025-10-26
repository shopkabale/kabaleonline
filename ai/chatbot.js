// File: /ai/chatbot.js

document.addEventListener('DOMContentLoaded', function () {

  const MEMORY_KEY = 'kabale_memory_v4';
  const PENDING_KEY = 'kabale_pending_v4';
  const DRAFTS_KEY = 'kabale_drafts_v4';
  const ADMIN_KEYWORD = 'kabale_admin_2025';
  const MAX_MEMORY = 30;
  const NAME_KEY = 'kabale_user_name_v1';

  let isWaitingForName = false;

  const chatBody = document.getElementById('ko-body');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');
  const adminModal = document.getElementById('admin-modal');
  const pendingListEl = document.getElementById('pending-list');
  const openAdminBtn = document.getElementById('ko-open-admin');
  const closeAdminBtn = document.getElementById('close-admin-btn');
  const approveAllBtn = document.getElementById('approve-all-btn');
  const clearPendingBtn = document.getElementById('clear-pending-btn');

  function nowTime() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function safeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function load(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : []; } catch (e) { return []; } }
  function save(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.warn('save failed', e); } }
  function pushMemory(role, text) { const mem = load(MEMORY_KEY); mem.push({ role, text, time: new Date().toISOString() }); if (mem.length > MAX_MEMORY) mem.splice(0, mem.length - MAX_MEMORY); save(MEMORY_KEY, mem); }
  function loadUserName() { return localStorage.getItem(NAME_KEY); }
  function saveUserName(name) { localStorage.setItem(NAME_KEY, name); }
  function capitalize(s) { if (!s) return ''; return s.charAt(0).toUpperCase() + s.slice(1); }

  let pendingLearnings = load(PENDING_KEY);

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

    const userName = loadUserName();
    if (userName && typeof text === 'string') {
      text = text.replace(/\$\{userName\}/g, userName);
    }

    let html = '';
    if (type === 'received') {
      html = `<div class="message-block"><div class="avatar"><i class="fa-solid fa-robot"></i></div>
              <div class="message-content"><div class="message received">${text}</div><div class="timestamp">${time}</div></div></div>`;
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

  function renderPendingList() {
    if (!pendingListEl) return;
    pendingListEl.innerHTML = '';
    if (!pendingLearnings.length) {
      pendingListEl.innerHTML = '<div style="padding:8px; color:var(--muted)">No pending learnings on this device.</div>';
      return;
    }
    pendingLearnings.forEach((p, idx) => {
      const item = document.createElement('div');
      item.className = 'pending-item';
      const textContent = p.question || (p.sample ? p.sample.title : 'Unknown');
      item.innerHTML = `
        <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <strong>${p.type || 'unknown'}</strong>: ${textContent}
        </div>
      `;
      pendingListEl.appendChild(item);
    });
  }
  
  function addPending(item) {
    // Save locally for the admin's personal review panel
    if (sessionStorage.getItem('isAdmin') === 'true') {
        pendingLearnings.push(item);
        save(PENDING_KEY, pendingLearnings);
        renderPendingList();
    }

    // Always send a copy to the central server log for all users
    fetch('/.netlify/functions/log-learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    }).catch(err => console.warn("Failed to log learning to server:", err));
  }

  async function generateReply(userText) {
    if (isWaitingForName) {
      const userName = capitalize(userText.trim());
      if (userName) {
        saveUserName(userName);
        isWaitingForName = false;
        return { ...answers['confirm_name_set'] };
      } else {
        return { text: "Please let me know what to call you!", suggestions: [] };
      }
    }

    pushMemory('user', userText);
    const lc = userText.toLowerCase();

    if (lc.match(/\bi am admin\s+([^\s]+)/) || lc.startsWith('/') || lc.startsWith('teach:')) {
      const adminMatch = lc.match(/\bi am admin\s+([^\s]+)/);
      if (adminMatch && adminMatch[1] === ADMIN_KEYWORD) {
        sessionStorage.setItem('isAdmin', 'true');
        if (openAdminBtn) openAdminBtn.style.display = 'block';
        return { text: '✅ Admin mode unlocked. You can now use the shield icon or type /admin.' };
      }
      if (sessionStorage.getItem('isAdmin') !== 'true') return { text: 'Admin commands are for verified admins only.' };
      
      const teachMatch = userText.match(/^\s*teach\s*:\s*(.+?)\s*=>\s*(.+)$/i);
      if (teachMatch) {
          const [q, a] = [teachMatch[1].trim(), teachMatch[2].trim()];
          addPending({ type: 'teach', question: q, answer: a });
          return { text: 'Saved to pending learnings.' };
      }
      
      if (lc === '/admin' || lc === '/panel') {
          if(adminModal) {
              renderPendingList();
              adminModal.setAttribute('aria-hidden', 'false');
          }
          return null;
      }
      return { text: 'Unknown admin command.' };
    }

    for (const phrase of (responses.user_set_name || [])) {
      if (lc.startsWith(phrase + ' ')) {
        const userName = capitalize(userText.substring(phrase.length).trim());
        saveUserName(userName);
        return { ...answers['confirm_name_set'] };
      }
    }

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

    const clar = { text: "My apologies, my knowledge base is still growing...", suggestions: ["How to sell", "Find a hostel", "Is selling free?"] };
    addPending({ type: 'unknown', question: userText, answer: clar.text, time: new Date().toISOString() });
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

  openAdminBtn && openAdminBtn.addEventListener('click', () => { 
      if(adminModal) {
          renderPendingList();
          adminModal.setAttribute('aria-hidden', 'false');
      }
  });
  closeAdminBtn && closeAdminBtn.addEventListener('click', () => { if(adminModal) adminModal.setAttribute('aria-hidden', 'true'); });
  
  function initialize() {
    if (sessionStorage.getItem('isAdmin') === 'true') {
      if (openAdminBtn) openAdminBtn.style.display = 'block';
    }
    const mem = load(MEMORY_KEY);
    const userName = loadUserName();

    if (!userName && !mem.length) {
      isWaitingForName = true;
      appendMessage(answers['first_visit_greeting'], 'received');
      pushMemory('bot', answers['first_visit_greeting'].text);
    } else if (userName) {
      const welcomeBackMessage = {
        text: `👋 Welcome back, ${userName}! I'm Amara. How can I help you today?`,
        suggestions: ["How to sell", "Find a hostel", "Is selling free?"]
      };
      appendMessage(welcomeBackMessage, 'received');
    } else {
      appendMessage(answers['greetings'], 'received');
    }
  }

  initialize();
});