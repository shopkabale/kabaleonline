// File: /ai/chatbot.js
// KabaleOnline Assistant v4.2 - (Final Version with All Features & Fixes, No Guided Flow)
// Requires responses.js and answers.js to be loaded before this script.

document.addEventListener('DOMContentLoaded', function () {

  // ------------- CONFIG -------------
  const MEMORY_KEY = 'kabale_memory_v4';
  const PENDING_KEY = 'kabale_pending_v4';
  const DRAFTS_KEY = 'kabale_drafts_v4';
  const SHEET_ENDPOINT = '/.netlify/functions/appendToSheet';
  const ADMIN_KEYWORD = 'kabale_admin_2025';
  const MAX_MEMORY = 30;

  // ------------- ELEMENTS -------------
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

  // ------------- THEME -------------
  toggleThemeBtn && toggleThemeBtn.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-mode');
    const newTheme = isDark ? 'light-mode' : 'dark-mode';
    document.body.className = '';
    document.body.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
  });

  // ------------- UTILS -------------
  function nowTime(){ return new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
  function safeRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
  function load(key){ try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : []; } catch(e){ return []; } }
  function save(key, data){ try{ localStorage.setItem(key, JSON.stringify(data)); } catch(e){ console.warn('save failed', e); } }
  function pushMemory(role, text, meta = {}){ const mem = load(MEMORY_KEY); mem.push({role, text, time: new Date().toISOString(), meta}); if(mem.length>MAX_MEMORY) mem.splice(0, mem.length - MAX_MEMORY); save(MEMORY_KEY, mem); }
  function getRecentSummary(limit=6){ const mem = load(MEMORY_KEY).filter(m=>m.role==='user'); return mem.slice(-limit).map(m=>m.text).join(' • '); }
  function levenshteinDistance(a,b){ if(!a) return b.length; if(!b) return a.length; a=a.toLowerCase(); b=b.toLowerCase(); const m=Array(b.length+1).fill(null).map(()=>Array(a.length+1).fill(null)); for(let i=0;i<=a.length;i++) m[0][i]=i; for(let j=0;j<=b.length;j++) m[j][0]=j; for(let j=1;j<=b.length;j++){ for(let i=1;i<=a.length;i++){ const cost = a[i-1]===b[j-1]?0:1; m[j][i]=Math.min(m[j][i-1]+1, m[j-1][i]+1, m[j-1][i-1]+cost); } } return m[b.length][a.length]; }

  // ------------- DATA STORES -------------
  let pendingLearnings = load(PENDING_KEY);
  let draftListings = load(DRAFTS_KEY);

  // ------------- UI HELPERS -------------
  function appendMessage(content, type){
    const time = nowTime();
    const wrapper = document.createElement('div'); wrapper.classList.add('message-wrapper', `${type}-wrapper`);
    let text = (type==='received' && typeof content==='object') ? content.text : content;
    if (text === undefined) text = "I didn't catch that. Can you say it differently?";
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
      const sc = document.createElement('div'); sc.className = 'suggestions-container';
      content.suggestions.forEach(s => {
        const b = document.createElement('button'); b.className = 'suggestion-chip'; b.textContent = s; b.onclick = ()=>handleSend(s);
        sc.appendChild(b);
      });
      wrapper.appendChild(sc);
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  function showTyping(){ const wrapper = document.createElement('div'); wrapper.classList.add('message-wrapper','received-wrapper','typing-indicator-wrapper'); wrapper.innerHTML = `<div class="avatar"><i class="fa-solid fa-robot"></i></div><div class="typing-indicator"><span></span><span></span><span></span></div>`; chatMessages.appendChild(wrapper); chatMessages.scrollTop = chatMessages.scrollHeight; return wrapper; }

  // --- ONLINE "TOOLS" ---
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

  // --- PENDING LEARNINGS ---
  async function sendToSheet(entry){
    try {
      const res = await fetch(SHEET_ENDPOINT, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(entry) });
      if (!res.ok) { const txt = await res.text(); console.warn('sheet push failed', txt); return { ok:false }; }
      return { ok:true, result: await res.json() };
    } catch (e) { console.warn('sheet push error', e); return { ok:false, error:String(e) }; }
  }
  function addPending(item){ pendingLearnings.push(item); save(PENDING_KEY, pendingLearnings); renderPendingList(); }
  async function trySyncPending(){
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
  function renderPendingList(){
    if (!pendingListEl) return;
    pendingListEl.innerHTML = '';
    if (!pendingLearnings.length) { pendingListEl.innerHTML = '<div style="padding:8px;color:var(--muted)">No pending learnings</div>'; return; }
    pendingLearnings.forEach((p, idx) => {
      const item = document.createElement('div'); item.className = 'pending-item';
      const left = document.createElement('div'); left.style.flex='1';
      left.innerHTML = `<strong>${p.type || 'example'}</strong><div style="font-size:13px;color:var(--muted)">${p.question || (p.sample ? p.sample.title : '')}</div>`;
      const right = document.createElement('div'); right.style.display='flex'; right.style.gap='6px';
      const btnSync = document.createElement('button'); btnSync.textContent='Sync';
      const btnDel = document.createElement('button'); btnDel.textContent='Delete';
      btnSync.onclick = async () => {
        const payload = { type: p.type || 'learning', timestamp: p.time || new Date().toISOString(), userMessage: p.question || (p.sample ? JSON.stringify(p.sample) : ''), detectedIntent: p.meta?.intent || p.type || '', responseGiven: p.answer || '', contextSummary: p.context || getRecentSummary(), isAdmin: sessionStorage.getItem('isAdmin') === 'true' ? 'true' : 'false' };
        const rr = await sendToSheet(payload);
        if (rr && rr.ok) { pendingLearnings.splice(idx,1); save(PENDING_KEY, pendingLearnings); renderPendingList(); appendMessage({ text:'Synced one learning.' }, 'received'); }
        else { appendMessage({ text:'Could not sync. Check network or function.' }, 'received'); }
      };
      btnDel.onclick = () => { pendingLearnings.splice(idx,1); save(PENDING_KEY, pendingLearnings); renderPendingList(); };
      right.appendChild(btnSync); right.appendChild(btnDel);
      item.appendChild(left); item.appendChild(right);
      pendingListEl.appendChild(item);
    });
  }
  
  // --- ⭐ GENERATE REPLY (FINAL UPGRADED VERSION) ⭐ ---
  async function generateReply(userText){
    pushMemory('user', userText);
    const lc = userText.toLowerCase();

    // PRIORITY 1: Admin Commands
    if (lc.match(/\bi am admin\s+([^\s]+)/) || lc.startsWith('/') || lc.startsWith('teach:')) {
        const adminMatch = lc.match(/\bi am admin\s+([^\s]+)/);
        if (adminMatch && adminMatch[1] === ADMIN_KEYWORD) {
            sessionStorage.setItem('isAdmin','true');
            if (openAdminBtn) openAdminBtn.style.display = 'block';
            return { text: '✅ Admin mode unlocked.' };
        }
        if (sessionStorage.getItem('isAdmin') !== 'true') return { text: 'Admin commands are for verified admins only.' };
        const teachMatch = userText.match(/^\s*teach\s*:\s*(.+?)\s*=>\s*(.+)$/i);
        if(teachMatch) {
            const [q, a] = [teachMatch[1].trim(), teachMatch[2].trim()];
            addPending({ type:'teach', question: q, answer: a });
            return { text: 'Saved to pending learnings. Use ⚙️ or /sync to send.' };
        }
        if (lc === '/sync learnings') { trySyncPending(); return null; }
        if (lc === '/show learnings') {
          if (!pendingLearnings.length) return { text: 'No pending learnings.' };
          const lines = pendingLearnings.map((p,i) => `${i+1}. ${p.type} — ${p.question || (p.sample ? p.sample.title : '')}`).join('\n');
          return { text: `<pre style="white-space:pre-wrap">${lines}</pre>` };
        }
        if (lc === '/show drafts') {
            if (!draftListings.length) return { text: 'No drafts saved.' };
            const lines = draftListings.map((d,i)=>`${i+1}. ${d.title} — ${d.price}`).join('\n');
            return { text: `<pre style="white-space:pre-wrap">${lines}</pre>` };
        }
        if (lc === '/clear memory') { localStorage.removeItem(MEMORY_KEY); return { text: 'Memory cleared.' }; }
        return { text: 'Unknown admin command.' };
    }

    // PRIORITY 2: "How-To" Questions (High-priority offline)
    const howToActions = {
        sell: ['how to sell', 'how do i sell', 'guide to selling', 'how to post'],
        buy: ['how to buy', 'how do i buy', 'guide to buying'],
        rent: ['how to rent', 'how do i rent', 'guide to rentals']
    };
    for (const action in howToActions) {
        for (const phrase of howToActions[action]) {
            if (lc.startsWith(phrase)) {
                return answers[action];
            }
        }
    }
    
    // PRIORITY 3: Online Lookups (Category & Product)
    for (const key in responses) {
        if (key.startsWith("category_")) {
            for (const keyword of responses[key]) {
                const regex = new RegExp(`\\b${safeRegex(keyword)}\\b`, 'i');
                if (regex.test(lc)) {
                    let categoryName = key.replace("category_", "").charAt(0).toUpperCase() + key.slice(9);
                    if (categoryName === 'Clothing') categoryName = 'Clothing & Apparel';
                    if (categoryName === 'Furniture') categoryName = 'Home & Furniture';
                    return await callProductLookupAPI({ categoryName: categoryName });
                }
            }
        }
    }
    const productTriggers = ["price of", "cost of", "how much is", "do you have", "what's the price of"];
    for (const trigger of productTriggers) {
        if (lc.includes(trigger)) {
            let productName = lc.split(trigger).pop().trim().replace(/^(a|an|the)\s/,'');
            if(productName) return await callProductLookupAPI({ productName });
        }
    }

    // PRIORITY 4: General Offline Queries (Whole Word Match)
    let bestMatch = { key: null, score: 0 };
    for (const key in responses) {
        if (key.startsWith("category_") || key.startsWith("product_")) continue;
        for (const kw of responses[key]) {
            const regex = new RegExp(`\\b${safeRegex(kw)}\\b`, 'i');
            if (regex.test(lc)) {
                const score = kw.length;
                if (score > bestMatch.score) { bestMatch = { key, score }; }
            }
        }
    }
    if (bestMatch.key) { return answers[bestMatch.key]; }

    // PRIORITY 5: Final Fallback
    const clar = { text: "I didn't quite get that. Could you ask in a different way?", suggestions: ["How to sell", "Find a hostel", "Contact admin"] };
    addPending({ type:'unknown', question: userText, answer: clar.text, time:new Date().toISOString() });
    return clar;
  }
  
  // --- MAIN HANDLER ---
  chatForm.addEventListener('submit', async (e)=>{ e.preventDefault(); handleSend(messageInput.value); });
  async function handleSend(raw){
    const text = (raw||'').trim();
    if (!text) return;
    const oldSuggestions = document.querySelector('.suggestions-container'); if (oldSuggestions) oldSuggestions.remove();
    appendMessage(text, 'sent');
    messageInput.value = '';
    pushMemory('user', text);
    const tEl = showTyping();
    const reply = await generateReply(text);
    tEl.remove();
    if (reply) {
      appendMessage(reply, 'received');
      pushMemory('bot', typeof reply === 'object' ? reply.text : reply);
    }
  }

  // --- ADMIN MODAL & BUTTONS ---
  openAdminBtn && openAdminBtn.addEventListener('click', ()=>{ adminModal.setAttribute('aria-hidden','false'); renderPendingList(); });
  closeAdminBtn && closeAdminBtn.addEventListener('click', ()=> adminModal.setAttribute('aria-hidden','true'));
  approveAllBtn && approveAllBtn.addEventListener('click', async ()=> { await trySyncPending(); });
  clearPendingBtn && clearPendingBtn.addEventListener('click', ()=> { pendingLearnings=[]; save(PENDING_KEY, pendingLearnings); renderPendingList(); });
  
  // --- INITIALIZATION ---
  function initialize(){
    if (sessionStorage.getItem('isAdmin') === 'true') {
        if (openAdminBtn) openAdminBtn.style.display = 'block';
    }
    const mem = load(MEMORY_KEY);
    if (!mem.length) {
      appendMessage(answers['greetings'] || { text:'Hello!'}, 'received');
      pushMemory('bot', (answers['greetings'] && answers['greetings'].text) || 'Hello!');
    } else {
      const recent = getRecentSummary(3) || 'no recent topics';
      appendMessage({ text: `Welcome back! I remember we talked about: ${recent}` }, 'received');
    }
    if(adminModal) renderPendingList();
  }
  
  initialize();
});