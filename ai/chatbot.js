// File: /ai/chatbot.js
// KabaleOnline Assistant v4.1 - (Corrected Admin Priority & UI)
// Requires responses.js and answers.js to be loaded before this script.

document.addEventListener('DOMContentLoaded', function () {

  // ------------- CONFIG -------------
  const MEMORY_KEY = 'kabale_memory_v4';
  const PENDING_KEY = 'kabale_pending_v4';
  const DRAFTS_KEY = 'kabale_drafts_v4';
  const SHEET_ENDPOINT = '/.netlify/functions/appendToSheet'; // your existing function
  const ADMIN_KEYWORD = 'kabale_admin_2025'; // admin secret
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

  // ------------- INTENT DETECTION (light) -------------
  const INTENTS = {
    greeting: ["hi","hello","hey","good morning","good afternoon","greetings"],
    sell: ["sell","post","upload","list","advertise","place ad"],
    buy: ["buy","purchase","looking for","find","shop","where can i find","i want"],
    price_query: ["price of","cost of","how much is","what's the price","how much"],
    contact_admin: ["admin","contact","support","help me","report"],
    thanks: ["thanks","thank you"],
    goodbye: ["bye","goodbye","see you"]
  };

  function extractEntities(text){
    const out = {};
    if (responses) {
      for (const k in responses) {
        if (!k.startsWith('category_')) continue;
        for (const kw of responses[k]) {
          const r = new RegExp('\\b'+safeRegex(kw)+'\\b','i');
          if (r.test(text)) out.category = k.replace('category_','');
        }
      }
      if (responses.specific_products) {
        for (const p of responses.specific_products) {
          const r = new RegExp('\\b'+safeRegex(p)+'\\b','i');
          if (r.test(text)) { out.product = p; break; }
        }
      }
    }
    if (/\bkabale\b/i.test(text)) out.location = 'Kabale';
    return out;
  }

  function detectIntent(text){
    const lc = text.toLowerCase();
    for (const [intent, phrases] of Object.entries(INTENTS)) {
      for (const ph of phrases) {
        if (lc.includes(ph)) return {intent, confidence:0.95, entities: extractEntities(lc)};
      }
    }
    if (responses && responses.specific_products) {
      for (const prod of responses.specific_products) {
        const d = levenshteinDistance(lc, prod.toLowerCase());
        if (d <= 2 || lc.includes(prod.toLowerCase())) return {intent:'price_query', confidence:0.9, entities:{product:prod}};
      }
    }
    return {intent:'unknown', confidence:0.4, entities: extractEntities(lc)};
  }

  // ------------- GUIDED LISTING FLOW -------------
  let sellingFlow = null;
  function startSellingFlow(){ sellingFlow = { stage:'title', draft:{ title:'', price:'', description:'', contact:'' } }; appendMessage({ text: "Let's create your listing — what's the item title?" }, 'received'); }
  async function processSellingFlow(userText){
    if (!sellingFlow) return false;
    if (sellingFlow.stage === 'title') { sellingFlow.draft.title = userText; sellingFlow.stage = 'price'; appendMessage({ text: "Price? (e.g., 200000 or negotiable)"}, 'received'); return true; }
    if (sellingFlow.stage === 'price') { sellingFlow.draft.price = userText; sellingFlow.stage = 'description'; appendMessage({ text: "Short description or condition (one line)." }, 'received'); return true; }
    if (sellingFlow.stage === 'description') { sellingFlow.draft.description = userText; sellingFlow.stage = 'contact'; appendMessage({ text: "Contact (WhatsApp number or 'via KabaleOnline inbox')." }, 'received'); return true; }
    if (sellingFlow.stage === 'contact') {
      sellingFlow.draft.contact = userText;
      const draft = { ...sellingFlow.draft, created_at: new Date().toISOString() };
      draftListings.push(draft); save(DRAFTS_KEY, draftListings);
      appendMessage({ text: `Saved draft locally: "${draft.title}" — use /show drafts to view.` }, 'received');
      addPending({ type:'listing_example', sample: draft, meta:{confidence:0.9} });
      sellingFlow = null;
      return true;
    }
    return false;
  }

  // ------------- PENDING LEARNINGS to Google Sheet -------------
  async function sendToSheet(entry){
    try {
      const res = await fetch(SHEET_ENDPOINT, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(entry)
      });
      if (!res.ok) {
        const txt = await res.text();
        console.warn('sheet push failed', txt);
        return { ok:false, status: res.status, text: txt };
      }
      return { ok:true, result: await res.json() };
    } catch (e) {
      console.warn('sheet push error', e);
      return { ok:false, error:String(e) };
    }
  }

  function addPending(item){
    pendingLearnings.push(item); save(PENDING_KEY, pendingLearnings); renderPendingList();
  }

  async function trySyncPending(){
    if (!pendingLearnings.length) { appendMessage({ text: 'No pending learnings to sync.' }, 'received'); return; }
    appendMessage({ text: `Syncing ${pendingLearnings.length} learnings...` }, 'received');
    const copy = [...pendingLearnings];
    let successfulSyncs = 0;
    for (const p of copy) {
      const payload = {
        type: p.type || 'learning',
        timestamp: p.time || new Date().toISOString(),
        userMessage: p.question || (p.sample ? JSON.stringify(p.sample) : ''),
        detectedIntent: p.meta?.intent || p.type || '',
        responseGiven: p.answer || '',
        contextSummary: p.context || getRecentSummary(),
        isAdmin: sessionStorage.getItem('isAdmin') === 'true' ? 'true' : 'false',
      };
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

  // ------------- PENDING UI -------------
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
        if (rr && rr.ok) {
          pendingLearnings.splice(idx,1); save(PENDING_KEY, pendingLearnings); renderPendingList(); appendMessage({ text:'Synced one learning.' }, 'received');
        } else {
          appendMessage({ text:'Could not sync. Check network or function.' }, 'received');
        }
      };
      btnDel.onclick = () => { pendingLearnings.splice(idx,1); save(PENDING_KEY, pendingLearnings); renderPendingList(); };
      right.appendChild(btnSync); right.appendChild(btnDel);
      item.appendChild(left); item.appendChild(right);
      pendingListEl.appendChild(item);
    });
  }

  // --- ⭐ GENERATE REPLY (FINAL CORRECTED VERSION) ⭐ ---
  async function generateReply(userText){
    pushMemory('user', userText);
    const lc = userText.toLowerCase();

    // PRIORITY 1: Check for Admin Commands FIRST
    const adminMatch = lc.match(/\bi am admin\s+([^\s]+)/);
    if (adminMatch && adminMatch[1] === ADMIN_KEYWORD) {
      sessionStorage.setItem('isAdmin','true');
      if (openAdminBtn) openAdminBtn.style.display = 'block'; // Show the admin button
      const msg = { text: '✅ Welcome back, Admin! Admin commands unlocked. Try /show learnings or /sync learnings.' };
      pushMemory('bot', msg.text, { admin:true });
      return msg;
    }

    const teachMatch = userText.match(/^\s*teach\s*:\s*(.+?)\s*=>\s*(.+)$/i);
    if (teachMatch) {
      if (sessionStorage.getItem('isAdmin') === 'true') {
        const q = teachMatch[1].trim(); const a = teachMatch[2].trim();
        const entry = { type:'teach', question: q, answer: a, time: new Date().toISOString(), meta:{confidence:1.0, source:'inline-teach'} };
        addPending(entry);
        return { text: 'Saved to pending learnings. Please use the Admin Panel (⚙️) or /sync learnings to send to Google Sheet.' };
      }
    }

    if (userText.startsWith('/')) {
      if (sessionStorage.getItem('isAdmin') !== 'true') return { text: 'Admin commands are for verified admins only.' };
      const cmd = userText.trim().toLowerCase();
      if (cmd === '/show learnings') {
        if (!pendingLearnings.length) return { text: 'No pending learnings.' };
        const lines = pendingLearnings.map((p,i) => `${i+1}. ${p.type} — ${p.question || (p.sample ? p.sample.title : '')}`).join('\n');
        return { text: `<pre style="white-space:pre-wrap">${lines}</pre>` };
      }
      if (cmd === '/sync learnings') { trySyncPending(); return null; }
      if (cmd === '/clear memory') { localStorage.removeItem(MEMORY_KEY); return { text: 'Memory cleared.' }; }
      if (cmd === '/show drafts') {
        if (!draftListings.length) return { text: 'No drafts saved.' };
        const lines = draftListings.map((d,i)=>`${i+1}. ${d.title} — ${d.price}`).join('\n');
        return { text: `<pre style="white-space:pre-wrap">${lines}</pre>` };
      }
      return { text: 'Unknown admin command.' };
    }
    
    // PRIORITY 2: "How-To" Questions (High-priority offline answers)
    const howToActions = {
        sell: ['how to sell', 'how do i sell', 'guide to selling'],
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
    
    // PRIORITY 3: Guided Selling Flow Trigger
    const sellTriggers = ['sell something', 'post an item', 'upload a product', 'create a listing'];
    if (sellTriggers.some(p => lc.includes(p))) {
        startSellingFlow();
        return null;
    }
    if (sellingFlow) {
        const done = await processSellingFlow(userText);
        if (done) return null;
    }

    // PRIORITY 4: Online Lookups (Category & Product)
    for (const key in responses) {
        if (key.startsWith("category_")) {
            for (const keyword of responses[key]) {
                const regex = new RegExp(`\\b${safeRegex(keyword)}\\b`, 'i');
                if (regex.test(lc)) {
                    let categoryName = key.replace("category_", "");
                    categoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
                    if (categoryName === 'Clothing') categoryName = 'Clothing & Apparel';
                    if (categoryName === 'Furniture') categoryName = 'Home & Furniture';
                    return await callProductLookupAPI({ categoryName: categoryName });
                }
            }
        }
    }
    const productTriggers = ["price of", "cost of", "how much is", "do you have"];
    for (const trigger of productTriggers) {
        if (lc.startsWith(trigger)) {
            let productName = lc.replace(trigger, '').trim().replace(/^(a|an|the)\s/,'');
            if(productName) return await callProductLookupAPI({ productName });
        }
    }

    // PRIORITY 5: General Offline Queries (Whole Word Match)
    let bestMatch = { key: null, score: 0 };
    for (const key in responses) {
        for (const kw of responses[key]) {
            const regex = new RegExp(`\\b${safeRegex(kw)}\\b`, 'i');
            if (regex.test(lc)) {
                const score = kw.length;
                if (score > bestMatch.score) { bestMatch = { key, score }; }
            }
        }
    }
    if (bestMatch.key) { return answers[bestMatch.key]; }

    // PRIORITY 6: Final Fallback
    const clar = { text: "I didn't quite get that. Could you ask in a different way?", suggestions: ["How to sell", "Find a hostel", "Contact admin"] };
    addPending({ type:'unknown', question: userText, answer: clar.text, time:new Date().toISOString() });
    return clar;
  }
  
  function extractProductFromText(text){
    if (responses && responses.specific_products) {
      for (const p of responses.specific_products) {
        const r = new RegExp('\\b'+safeRegex(p)+'\\b','i');
        if (r.test(text)) return p;
      }
    }
    const m = text.match(/price (of|for)\s+(.+)/i) || text.match(/how much (is|are)\s+(.+)/i);
    if (m && m[2]) return m[2].trim().replace(/^(a |an |the )/i,'').replace(/[?\.!]*$/,'');
    return null;
  }

  // ------------- main handler -------------
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

  // ------------- admin modal & buttons -------------
  openAdminBtn && openAdminBtn.addEventListener('click', ()=>{ adminModal.setAttribute('aria-hidden','false'); renderPendingList(); });
  closeAdminBtn && closeAdminBtn.addEventListener('click', ()=> adminModal.setAttribute('aria-hidden','true'));
  approveAllBtn && approveAllBtn.addEventListener('click', async ()=> { await trySyncPending(); });
  clearPendingBtn && clearPendingBtn.addEventListener('click', ()=> { pendingLearnings=[]; save(PENDING_KEY, pendingLearnings); renderPendingList(); });

  // ------------- online sync auto -------------
  window.addEventListener('online', async ()=> {
    if (pendingLearnings.length) {
      appendMessage({ text: 'You are online — syncing pending learnings...' }, 'received');
      await trySyncPending();
    }
  });
  
  // --- ⭐ CORRECTED INITIALIZATION ⭐ ---
  function initialize(){
    // Show admin button on load ONLY if the user is already an admin this session
    if (sessionStorage.getItem('isAdmin') === 'true') {
        if (openAdminBtn) openAdminBtn.style.display = 'block';
    }

    const mem = load(MEMORY_KEY);
    if (!mem.find(m=>m.role==='bot')) {
      appendMessage(answers['greetings'] || { text:'Hello!'}, 'received');
    } else {
      const recent = getRecentSummary(3) || 'no recent topics';
      appendMessage({ text: `Welcome back! I remember we talked about: ${recent}` }, 'received');
    }
    if(adminModal) renderPendingList();
  }
  
  initialize();
  
  window.kabaleAgent = {
    getMemory: ()=> load(MEMORY_KEY),
    getPending: ()=> pendingLearnings,
    getDrafts: ()=> draftListings,
    clearMemory: ()=> { localStorage.removeItem(MEMORY_KEY); appendMessage({ text:'Memory cleared.'}, 'received'); }
  };

});