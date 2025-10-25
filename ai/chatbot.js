// File: /bot/chatbot.js
// KabaleOnline Assistant v4.0 - offline-first, self-learning to Google Sheet, admin, guided listing
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
    const dark = document.body.classList.contains('dark-mode');
    if (dark) { document.body.classList.remove('dark-mode'); document.body.classList.add('light-mode'); localStorage.setItem('theme','light-mode'); }
    else { document.body.classList.remove('light-mode'); document.body.classList.add('dark-mode'); localStorage.setItem('theme','dark-mode'); }
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
    // product fuzzy check
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
  function asyncWait(ms){ return new Promise(r=>setTimeout(r,ms)); }
  async function processSellingFlow(userText){
    if (!sellingFlow) return false;
    if (sellingFlow.stage === 'title') { sellingFlow.draft.title = userText; sellingFlow.stage = 'price'; appendMessage({ text: "Price? (e.g., 200000 or negotiable)"}, 'received'); return true; }
    if (sellingFlow.stage === 'price') { sellingFlow.draft.price = userText; sellingFlow.stage = 'description'; appendMessage({ text: "Short description or condition (one line)." }, 'received'); return true; }
    if (sellingFlow.stage === 'description') { sellingFlow.draft.description = userText; sellingFlow.stage = 'contact'; appendMessage({ text: "Contact (WhatsApp number or 'via KabaleOnline inbox')." }, 'received'); return true; }
    if (sellingFlow.stage === 'contact') {
      sellingFlow.draft.contact = userText;
      const draft = Object.assign({}, sellingFlow.draft, { created_at: new Date().toISOString() });
      draftListings.push(draft); save(DRAFTS_KEY, draftListings);
      appendMessage({ text: `Saved draft locally: "${draft.title}" — use /show drafts to view.` }, 'received');
      // also add as pending learning (example listing)
      addPending({ type:'listing_example', sample: draft, meta:{confidence:0.9} });
      sellingFlow = null;
      return true;
    }
    return false;
  }

  // ------------- PENDING LEARNINGS to Google Sheet -------------
  async function sendToSheet(entry){
    // The Netlify function you already have should accept POST JSON data and write to the sheet.
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
      const j = await res.json();
      return { ok:true, result:j };
    } catch (e) {
      console.warn('sheet push error', e);
      return { ok:false, error:String(e) };
    }
  }

  function addPending(item){
    pendingLearnings.push(item); save(PENDING_KEY, pendingLearnings); renderPendingList(); // UI update
  }

  async function trySyncPending(){
    if (!pendingLearnings.length) { appendMessage({ text: 'No pending learnings to sync.' }, 'received'); return; }
    appendMessage({ text: `Syncing ${pendingLearnings.length} learnings...` }, 'received');
    const copy = pendingLearnings.slice();
    for (const p of copy) {
      const payload = {
        type: p.type || 'learning',
        timestamp: p.time || new Date().toISOString(),
        userMessage: p.question || (p.sample ? JSON.stringify(p.sample) : ''),
        detectedIntent: p.meta && p.meta.intent ? p.meta.intent : (p.type || ''),
        responseGiven: p.answer || '',
        contextSummary: p.context || getRecentSummary(),
        isAdmin: sessionStorage.getItem('isAdmin') === 'true' ? 'true' : 'false',
      };
      const r = await sendToSheet(payload);
      if (r && r.ok) {
        // remove from pending
        pendingLearnings = pendingLearnings.filter(x => x !== p);
        save(PENDING_KEY, pendingLearnings);
      } else {
        // break early if offline or failing
        appendMessage({ text: 'Could not sync some learnings. Will retry later.' }, 'received');
        break;
      }
    }
    renderPendingList();
    appendMessage({ text: 'Sync attempt finished.' }, 'received');
  }

  // ------------- PENDING UI -------------
  function renderPendingList(){
    pendingListEl.innerHTML = '';
    if (!pendingLearnings.length) { pendingListEl.innerHTML = '<div style="padding:8px;color:var(--muted)">No pending learnings</div>'; return; }
    pendingLearnings.forEach((p, idx) => {
      const item = document.createElement('div'); item.className = 'pending-item';
      const left = document.createElement('div'); left.style.flex='1';
      left.innerHTML = `<strong>${p.type || 'example'}</strong><div style="font-size:13px;color:var(--muted)">${p.question ? p.question : (p.sample ? (p.sample.title || JSON.stringify(p.sample)) : '')}</div>`;
      const right = document.createElement('div'); right.style.display='flex'; right.style.gap='6px';
      const btnSync = document.createElement('button'); btnSync.textContent='Sync';
      const btnDel = document.createElement('button'); btnDel.textContent='Delete';
      btnSync.onclick = async () => {
        const payload = {
          type: p.type || 'learning',
          timestamp: p.time || new Date().toISOString(),
          userMessage: p.question || (p.sample ? JSON.stringify(p.sample) : ''),
          detectedIntent: p.meta && p.meta.intent ? p.meta.intent : (p.type || ''),
          responseGiven: p.answer || '',
          contextSummary: p.context || getRecentSummary(),
          isAdmin: sessionStorage.getItem('isAdmin') === 'true' ? 'true' : 'false',
        };
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

  // ------------- GENERATE REPLY -------------
  async function generateReply(userText){
    pushMemory('user', userText);

    // admin activation check: "I am admin <key>"
    const adminMatch = userText.match(/\bI am admin\s+([^\s]+)/i);
    if (adminMatch && adminMatch[1] === ADMIN_KEYWORD) {
      sessionStorage.setItem('isAdmin','true');
      const msg = { text: '✅ Welcome back, Admin! Admin commands unlocked. Try /show learnings or /sync learnings.' };
      pushMemory('bot', msg.text, { admin:true });
      return msg;
    }

    // handle admin inline teach: teach: question => answer (only admin)
    const teachMatch = userText.match(/^\s*teach\s*:\s*(.+?)\s*=>\s*(.+)$/i);
    if (teachMatch) {
      if (sessionStorage.getItem('isAdmin') === 'true') {
        const q = teachMatch[1].trim(); const a = teachMatch[2].trim();
        const entry = { type:'teach', question: q, answer: a, time: new Date().toISOString(), meta:{confidence:1.0, source:'inline-teach'} };
        // attempt immediate push
        const payload = { type:'teach', timestamp: entry.time, userMessage: q, detectedIntent: 'teach', responseGiven: a, contextSummary: getRecentSummary(), isAdmin:'true' };
        const res = await sendToSheet(payload);
        if (res && res.ok) { return { text: 'Teaching saved to sheet ✅' }; }
        addPending(entry);
        return { text: 'Saved to pending learnings (offline or failed). Please /sync learnings later.' };
      } else {
        return { text: 'Only Admins can use teach:. Become admin by sending "I am admin <key>"' };
      }
    }

    // admin commands
    if (userText.startsWith('/')) {
      if (sessionStorage.getItem('isAdmin') !== 'true') return { text: 'Admin commands are for verified admins only. Send "I am admin <key>" to authenticate.' };
      const cmd = userText.trim().toLowerCase();
      if (cmd === '/show learnings') {
        if (!pendingLearnings.length) return { text: 'No pending learnings.' };
        const lines = pendingLearnings.map((p,i) => `${i+1}. ${p.type} — ${p.question ? p.question : (p.sample ? (p.sample.title || JSON.stringify(p.sample)) : '')}`).join('\n');
        return { text: '<pre style="white-space:pre-wrap">'+lines+'</pre>' };
      }
      if (cmd === '/sync learnings') { await trySyncPending(); return { text: 'Sync initiated (check messages).' }; }
      if (cmd === '/clear memory') { localStorage.removeItem(MEMORY_KEY); return { text: 'Memory cleared.' }; }
      if (cmd === '/show drafts') {
        if (!draftListings.length) return { text: 'No drafts saved.' };
        const lines = draftListings.map((d,i)=>`${i+1}. ${d.title} — ${d.price}`).join('\n');
        return { text: '<pre style="white-space:pre-wrap">'+lines+'</pre>' };
      }
      return { text: 'Unknown admin command.' };
    }

    // guided selling flow: trigger
    const intent = detectIntent(userText);
    if (intent.intent === 'sell') { startSellingFlow(); return null; }

    // if in selling flow, handle stages
    if (sellingFlow) { const done = await processSellingFlow(userText); if (done) return null; }

    // price query handling
    if (intent.intent === 'price_query' || intent.entities && intent.entities.product) {
      const product = intent.entities.product || extractProductFromText(userText);
      if (product) {
        // create a learning entry about this QA attempt
        const answer = answers['help'] ? answers['help'].text : 'I found some info';
        addPending({ type:'qa_example', question: userText, answer: answer, meta:{confidence: intent.confidence}, time:new Date().toISOString() });
        // try product lookup (if you have a product-lookup function; fallback to answers)
        try {
          const res = await fetch('/.netlify/functions/product-lookup', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ productName: product }) });
          if (res.ok) {
            const j = await res.json();
            const obj = { text: j.text || 'Here are the results', suggestions: j.suggestions || [] };
            return obj;
          }
        } catch(e){ /* ignore */ }
        // fallback to local answer
        return answers['help'] || { text: 'I can help but could not lookup live; try again later.' };
      }
    }

    // responses.js whole-word matching (best match)
    let bestMatch = { key:null, score:0 };
    const txt = userText.toLowerCase();
    for (const key in responses) {
      if (key.startsWith('category_') || key === 'specific_products' || key === 'product_query') continue;
      for (const kw of responses[key]) {
        const r = new RegExp('\\b'+safeRegex(kw.toLowerCase())+'\\b','i');
        if (r.test(txt)) {
          const score = (kw||'').length;
          if (score > bestMatch.score) bestMatch = { key, score };
        }
      }
    }
    if (bestMatch.key && answers[bestMatch.key]) { return answers[bestMatch.key]; }

    // fuzzy fallback
    for (const key in responses) {
      if (key.startsWith('category_') || key === 'specific_products' || key === 'product_query') continue;
      for (const kw of responses[key]) {
        const tokens = txt.split(/\s+/);
        for (const t of tokens) {
          const limit = (kw.length > 5) ? 2 : 1;
          if (levenshteinDistance(t, kw.toLowerCase()) <= limit) {
            const a = answers[key] || answers['help'];
            addPending({ type:'fuzzy', question: userText, answer: a.text || '', meta:{confidence:0.6}, time:new Date().toISOString() });
            return a;
          }
        }
      }
    }

    // nothing matched -> clarify + add to pending
    const clar = { text: "I didn't get that — are you trying to *buy*, *sell*, ask about *a product*, or *contact admin*?", suggestions: ["I want to sell","I'm looking to buy","Contact admin","Find a service"] };
    addPending({ type:'unknown', question: userText, answer: clar.text, meta:{confidence:0.4}, time:new Date().toISOString() });
    return clar;
  }

  // ------------- small helpers -------------
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

    // special quick commands allowed for admin presence check
    if (/^show drafts$/i.test(text)) {
      if (!draftListings.length) appendMessage({ text: 'No drafts saved.' }, 'received');
      else appendMessage({ text: draftListings.map(d=>`• ${d.title} — ${d.price}`).join('<br>') }, 'received');
      return;
    }

    // typing indicator
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
      appendMessage({ text: 'Sync finished (online event).' }, 'received');
    }
  });

  // ------------- init -------------
  function initialize(){
    // greet
    const mem = load(MEMORY_KEY);
    if (!mem.find(m=>m.role==='bot')) {
      appendMessage(answers['greetings'] || { text:'Hello!'}, 'received');
      pushMemory('bot', (answers['greetings'] && answers['greetings'].text) || 'Hello!');
    } else {
      const recent = getRecentSummary(3) || 'no recent topics';
      appendMessage({ text: `Welcome back! I remember: ${recent}` }, 'received');
    }
    renderPendingList();
  }
  initialize();

  // ------------- expose debug -------------
  window.kabaleAgent = {
    getMemory: ()=> load(MEMORY_KEY),
    getPending: ()=> pendingLearnings.slice(),
    getDrafts: ()=> draftListings.slice(),
    clearMemory: ()=> { localStorage.removeItem(MEMORY_KEY); appendMessage({ text:'Memory cleared.'}, 'received'); }
  };

});