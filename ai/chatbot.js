document.addEventListener('DOMContentLoaded', function () {

  const MEMORY_KEY = 'kabale_memory_v4';
  const PENDING_KEY = 'kabale_pending_v4';
  const DRAFTS_KEY = 'kabale_drafts_v4';
  const SHEET_ENDPOINT = '/.netlify/functions/appendToSheet';
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
  const toggleThemeBtn = document.getElementById('ko-toggle-theme');

  toggleThemeBtn && toggleThemeBtn.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-mode');
    const newTheme = isDark ? 'light-mode' : 'dark-mode';
    document.body.className = '';
    document.body.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
  });

  function nowTime() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function safeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function load(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : []; } catch (e) { return []; } }
  function save(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.warn('save failed', e); } }
  function pushMemory(role, text, meta = {}) { const mem = load(MEMORY_KEY); mem.push({ role, text, time: new Date().toISOString(), meta }); if (mem.length > MAX_MEMORY) mem.splice(0, mem.length - MAX_MEMORY); save(MEMORY_KEY, mem); }
  function getRecentSummary(limit = 6) { const mem = load(MEMORY_KEY).filter(m => m.role === 'user'); return mem.slice(-limit).map(m => m.text).join(' • '); }
  function loadUserName() { return localStorage.getItem(NAME_KEY); }
  function saveUserName(name) { localStorage.setItem(NAME_KEY, name); }
  function capitalize(s) { if (!s) return ''; return s.charAt(0).toUpperCase() + s.slice(1); }

  let pendingLearnings = load(PENDING_KEY);
  let draftListings = load(DRAFTS_KEY);

  function scrollToBottom() {
    chatBody.scrollTop = chatBody.scrollHeight;
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
        if (!res.ok) throw new Error('Server error');
        return await res.json();
    } catch (err) {
        console.error("Lookup API failed:", err);
        return { text: "Sorry, I couldn't connect to the product database right now." };
    }
  }

  async function sendToSheet(entry) {
    try {
      const res = await fetch(SHEET_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
      if (!res.ok) { const txt = await res.text(); console.warn('sheet push failed', txt); return { ok: false }; }
      return { ok: true, result: await res.json() };
    } catch (e) { console.warn('sheet push error', e); return { ok: false, error: String(e) }; }
  }

  function addPending(item) { pendingLearnings.push(item); save(PENDING_KEY, pendingLearnings); renderPendingList(); }

  async function trySyncPending() {
    if (!pendingLearnings.length) { appendMessage({ text: 'No pending learnings to sync.' }, 'received'); return; }
    appendMessage({ text: `Syncing ${pendingLearnings.length} learnings...` }, 'received');
    const copy = [...pendingLearnings];
    let successfulSyncs = 0;
    for (const p of copy) {
      const payload = { type: p.type || 'learning', timestamp: p.time || new Date().toISOString(), userMessage: p.question || (p.sample ? JSON.stringify(p.sample) : ''), detectedIntent: p.meta?.intent || p.type || '', responseGiven: p.answer || '', contextSummary: p.context || getRecentSummary(), isAdmin: sessionStorage.getItem('isAdmin') === 'true' ? 'true' : 'false' };
      const r = await sendToSheet(payload);
      if (r && r.ok) {
        pendingLearnings = pendingLearnings.filter(x => x !== p);
        successfulSyncs++;
      } else {
        appendMessage({ text: 'Could not sync some learnings. Will retry later.' }, 'received');
        break;
      }
    }
    save(PENDING_KEY, pendingLearnings);
    renderPendingList();
    appendMessage({ text: `Sync attempt finished. ${successfulSyncs} items synced.` }, 'received');
  }

  function renderPendingList() {
    if (!pendingListEl) return;
    pendingListEl.innerHTML = '';
    if (!pendingLearnings.length) { pendingListEl.innerHTML = '<div style="padding:8px;color:var(--muted)">No pending learnings</div>'; return; }
    pendingLearnings.forEach((p, idx) => {
      const item = document.createElement('div'); item.className = 'pending-item';
      const left = document.createElement('div'); left.style.flex = '1';
      left.innerHTML = `<strong>${p.type || 'example'}</strong><div style="font-size:13px;color:var(--muted)">${p.question || (p.sample ? p.sample.title : '')}</div>`;
      const right = document.createElement('div'); right.style.display = 'flex'; right.style.gap = '6px';
      const btnSync = document.createElement('button'); btnSync.textContent = 'Sync';
      const btnDel = document.createElement('button'); btnDel.textContent = 'Delete';
      btnSync.onclick = async () => {
        const payload = { type: p.type || 'learning', timestamp: p.time || new Date().toISOString(), userMessage: p.question || (p.sample ? JSON.stringify(p.sample) : ''), detectedIntent: p.meta?.intent || p.type || '', responseGiven: p.answer || '', contextSummary: p.context || getRecentSummary(), isAdmin: sessionStorage.getItem('isAdmin') === 'true' ? 'true' : 'false' };
        const rr = await sendToSheet(payload);
        if (rr && rr.ok) { pendingLearnings.splice(idx, 1); save(PENDING_KEY, pendingLearnings); renderPendingList(); appendMessage({ text: 'Synced one learning.' }, 'received'); }
        else { appendMessage({ text: 'Could not sync. Check network or function.' }, 'received'); }
      };
      btnDel.onclick = () => { pendingLearnings.splice(idx, 1); save(PENDING_KEY, pendingLearnings); renderPendingList(); };
      right.appendChild(btnSync); right.appendChild(btnDel);
      item.appendChild(left); item.appendChild(right);
      pendingListEl.appendChild(item);
    });
  }

  async function generateReply(userText) {
    if (isWaitingForName) {
      const userName = capitalize(userText.trim());
      saveUserName(userName);
      isWaitingForName = false;
      let reply = { ...answers['confirm_name_set'] };
      return reply;
    }

    pushMemory('user', userText);
    const lc = userText.toLowerCase();

    if (lc.match(/\bi am admin\s+([^\s]+)/) || lc.startsWith('/') || lc.startsWith('teach:')) {
      const adminMatch = lc.match(/\bi am admin\s+([^\s]+)/);
      if (adminMatch && adminMatch[1] === ADMIN_KEYWORD) {
        sessionStorage.setItem('isAdmin', 'true');
        if (openAdminBtn) openAdminBtn.style.display = 'block';
        return { text: '✅ Admin mode unlocked.' };
      }
      if (sessionStorage.getItem('isAdmin') !== 'true') return { text: 'Admin commands are for verified admins only.' };
      const teachMatch = userText.match(/^\s*teach\s*:\s*(.+?)\s*=>\s*(.+)$/i);
      if (teachMatch) {
        const [q, a] = [teachMatch[1].trim(), teachMatch[2].trim()];
        addPending({ type: 'teach', question: q, answer: a });
        return { text: 'Saved to pending learnings. Use ⚙️ or /sync to send.' };
      }
      if (lc === '/sync learnings') { trySyncPending(); return null; }
      if (lc === '/show learnings') {
        if (!pendingLearnings.length) return { text: 'No pending learnings.' };
        const lines = pendingLearnings.map((p, i) => `${i + 1}. ${p.type} — ${p.question || (p.sample ? p.sample.title : '')}`).join('\n');
        return { text: `<pre style="white-space:pre-wrap">${lines}</pre>` };
      }
      if (lc === '/clear memory') { localStorage.removeItem(MEMORY_KEY); return { text: 'Memory cleared.' }; }
      return { text: 'Unknown admin command.' };
    }

    for (const phrase of (responses.user_set_name || [])) {
      if (lc.startsWith(phrase + ' ')) {
        const userName = capitalize(userText.substring(phrase.length).trim());
        saveUserName(userName);
        let reply = { ...answers['confirm_name_set'] };
        return reply;
      }
    }
    for (const phrase of (responses.prompt_for_name || [])) {
      if (lc.includes(phrase)) {
        isWaitingForName = true;
        return answers['prompt_for_name'];
      }
    }

    let bestMatch = { key: null, score: 0 };
    for (const key in responses) {
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

    const clar = { text: "I didn't quite get that. Could you ask in a different way?", suggestions: ["How to sell", "Find a hostel", "Contact admin"] };
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

  openAdminBtn && openAdminBtn.addEventListener('click', () => { adminModal.setAttribute('aria-hidden', 'false'); renderPendingList(); });
  closeAdminBtn && closeAdminBtn.addEventListener('click', () => adminModal.setAttribute('aria-hidden', 'true'));
  approveAllBtn && approveAllBtn.addEventListener('click', async () => { await trySyncPending(); });
  clearPendingBtn && clearPendingBtn.addEventListener('click', () => { pendingLearnings = []; save(PENDING_KEY, pendingLearnings); renderPendingList(); });

  function initialize() {
    if (sessionStorage.getItem('isAdmin') === 'true') {
      if (openAdminBtn) openAdminBtn.style.display = 'block';
    }
    const mem = load(MEMORY_KEY);
    const userName = loadUserName();

    if (!mem.length && !userName) {
      appendMessage(answers['greetings'], 'received');
      pushMemory('bot', answers['greetings'].text);

      setTimeout(() => {
        const typingEl = showTyping();
        setTimeout(() => {
          typingEl.remove();
          isWaitingForName = true;
          appendMessage(answers['prompt_for_name'], 'received');
        }, 900);
      }, 700);
    } else if (userName) {
      let welcomeBackMessage = `👋 Welcome back, ${userName}! I'm Amara. How can I help you find today?`;
      appendMessage({ text: welcomeBackMessage, suggestions: ["How to sell", "Find a hostel", "Is selling free?"] }, 'received');
    } else {
      const recent = getRecentSummary(3) || 'previous topics';
      let welcomeBackMessage = `Welcome back! I remember we talked about: ${recent}.`;
      appendMessage({ text: welcomeBackMessage }, 'received');
    }

    if (adminModal) renderPendingList();
  }

  initialize();
});