/* chat-widget.js
   KabaleOnline full chat widget — Firebase + Algolia + HuggingFace proxy support.
   IMPORTANT: Do NOT commit secret keys. Use Netlify proxy for HF key.
*/

/* ============== CONFIG ============== */
// Hugging Face proxy (recommended). Deploy netlify function to use this.
const HF_PROXY = '/.netlify/functions/hf-proxy'; // recommended; keeps HF key server-side
// For quick local testing ONLY: set HF_PROXY = null and put your HF key below.
// const HF_PROXY = null;
const HF_CLIENT_KEY = null; // <-- ONLY for local testing. Do NOT commit.

// Firebase config (from you)
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBLf0fZUFGXS9NMS3rMr8Iisy-siAAiIyI",
  authDomain: "kabale-20ec4.firebaseapp.com",
  projectId: "kabale-20ec4",
  storageBucket: "kabale-20ec4.firebasestorage.app",
  messagingSenderId: "792218710477",
  appId: "1:792218710477:web:5a32cc3177ddba98ff5484",
  measurementId: "G-5XQRYNC9TW"
};

// Algolia (replace placeholders with your actual values)
const ALGOLIA_APP_ID = 'ALGOLIA_APP_ID_REPLACE';
const ALGOLIA_SEARCH_KEY = 'ALGOLIA_SEARCH_KEY_REPLACE'; // must be search-only key
const ALGOLIA_INDEX = 'products';

// WhatsApp redirect (replace if different). Use international format.
const WHATSAPP_NUMBER = '+256784655792'; // the number you provided

/* ============== END CONFIG ============== */

(function () {
  /* Minimal dependency-loading helpers */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // DOM refs: assumes chat HTML/CSS from earlier are present on page
  const root = document.getElementById('ko-chat-root');
  const toggle = document.getElementById('ko-chat-toggle');
  const windowEl = document.getElementById('ko-chat-window');
  const closeBtn = document.getElementById('ko-close-btn');
  const bodyEl = document.getElementById('ko-chat-body');
  const form = document.getElementById('ko-chat-form');
  const input = document.getElementById('ko-user-input');
  const quickWrap = document.getElementById('ko-quick-buttons');

  // local session history
  let sessionConv = [];

  // quick buttons
  const quickButtons = [
    { label: '🛍️ Post Item', text: 'How do I post an item on KabaleOnline?' },
    { label: '🏠 Rentals', text: 'Find rentals in Kabale' },
    { label: '🧰 Services', text: 'Find a plumber in Kabale' },
    { label: '❓ Help', text: 'How can you help me?' }
  ];

  // KabaleOnline training data (FAQ + site info). Expand as needed.
  const kabaleData = `
KabaleOnline is a local marketplace for Kabale District, Uganda. Categories: Services (plumbers, electricians, tutors), Items (phones, furniture, clothing), Rentals (houses, rooms, hostels), Lost & Found, Events.
Posting is free. To post an item: go to https://www.kabaleonline.com/post and fill title, description, price, location, and images. Buyers contact sellers via WhatsApp.`
  ;

  /* UTILS */
  function escapeHtml(s = '') {
    return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function appendMsg(html, cls = 'bot') {
    const el = document.createElement('div');
    el.className = `ko-msg ${cls === 'user' ? 'user' : 'bot'}`;
    el.innerHTML = html;
    bodyEl.appendChild(el);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    return el;
  }
  function showThinking() {
    const el = document.createElement('div');
    el.className = 'ko-msg bot';
    el.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span>`;
    bodyEl.appendChild(el);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    return el;
  }

  function renderQuickButtons() {
    quickWrap.innerHTML = '';
    quickButtons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'ko-quick-btn';
      btn.textContent = b.label;
      btn.onclick = () => {
        input.value = b.text;
        submitMessage(b.text);
      };
      quickWrap.appendChild(btn);
    });
  }

  function initChatUI() {
    sessionConv = [];
    appendMsg('👋 Hi! I’m KabaleOnline Assistant. Looking to buy, sell, or rent?', 'bot');
    renderQuickButtons();
    incrementVisitorCounter(); // best-effort
  }

  /* ========== Algolia search ========== */
  let algoliaClient = null;
  let algoliaIndex = null;
  async function initAlgolia() {
    if (ALGOLIA_APP_ID.includes('REPLACE') || ALGOLIA_SEARCH_KEY.includes('REPLACE')) {
      console.warn('Algolia placeholders not replaced. Search disabled until configured.');
      return;
    }
    if (algoliaClient) return;
    await loadScript('https://cdn.jsdelivr.net/npm/algoliasearch@4/dist/algoliasearch-lite.umd.js');
    algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
    algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX);
  }

  async function searchAlgolia(query, hits = 5) {
    if (!algoliaIndex) return [];
    try {
      const res = await algoliaIndex.search(query, { hitsPerPage: hits });
      return res.hits || [];
    } catch (e) {
      console.warn('Algolia search error', e);
      return [];
    }
  }

  /* ========== Firebase: lazy load and save chats ========== */
  let firebaseInitialized = false;
  async function loadFirebaseIfNeeded() {
    if (firebaseInitialized) return;
    // compat SDKs (works in simple embed scenarios)
    await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');
    firebase.initializeApp(FIREBASE_CONFIG);
    firebaseInitialized = true;
  }

  async function saveChatToFirestore({ question, answer }) {
    try {
      if (!FIREBASE_CONFIG || FIREBASE_CONFIG.apiKey.includes('REPLACE')) return;
      await loadFirebaseIfNeeded();
      const db = firebase.firestore();
      await db.collection('chat_messages').add({
        question: question || '',
        answer: answer || '',
        page: location.pathname,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        userAgent: navigator.userAgent
      });
    } catch (e) {
      console.warn('Failed to save chat', e);
    }
  }

  async function incrementVisitorCounter() {
    try {
      if (!FIREBASE_CONFIG || FIREBASE_CONFIG.apiKey.includes('REPLACE')) return;
      await loadFirebaseIfNeeded();
      const db = firebase.firestore();
      const ref = db.collection('counters').doc('visitors');
      await db.runTransaction(async tx => {
        const doc = await tx.get(ref);
        if (!doc.exists) tx.set(ref, { count: 1 });
        else tx.update(ref, { count: (doc.data().count || 0) + 1 });
      });
    } catch (e) {
      console.warn('Visitor counter failed', e);
    }
  }

  /* ========== HF call (proxy preferred) ========== */
  async function callHF(prompt) {
    // If proxy is set, call the proxy endpoint which must contain your HF key server-side.
    if (HF_PROXY) {
      const res = await fetch(HF_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 256 } })
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error('HF proxy error: ' + t);
      }
      const json = await res.json();
      // proxy returns { reply: "..." }
      return json.reply || '';
    }

    // No proxy: attempt direct client call (INSECURE). Requires HF_CLIENT_KEY to be set.
    if (!HF_CLIENT_KEY) throw new Error('No HF client key provided and no proxy configured.');
    const resp = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2', {
      method: 'POST',
      headers: { Authorization: `Bearer ${HF_CLIENT_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 256 } })
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error('HF direct error: ' + txt);
    }
    const out = await resp.json();
    const gen = Array.isArray(out) ? (out[0]?.generated_text || '') : (out.generated_text || '');
    return gen.replace(prompt, '').trim();
  }

  /* ========== Chat flow logic ========== */
  async function submitMessage(text) {
    if (!text || !text.trim()) return;
    const safe = escapeHtml(text);
    appendMsg(safe, 'user');
    input.value = '';
    sessionConv.push({ role: 'user', content: text });

    // quick local faq checks & intent routing
    const lower = text.toLowerCase();

    // Basic spam filter: reject inputs that are too long or contain suspicious links
    if (text.length > 2000) {
      appendMsg('⚠️ Your message is too long. Please shorten it.', 'bot');
      return;
    }
    if (/https?:\/\/\S+/i.test(text) && !/kabaleonline\.com/i.test(text)) {
      appendMsg('⚠️ External links are not allowed. Please describe your request without external links.', 'bot');
      return;
    }

    // Shortcut intents handled locally to make chat faster
    if (/post|sell|upload/i.test(lower)) {
      return handlePostFlow();
    }
    if (/rent|rental|house|room/i.test(lower)) {
      return handleRentalFlow();
    }
    if (/service|plumber|tutor|electrician/i.test(lower)) {
      return handleServiceFlow();
    }
    if (/lost|found|lost & found|missing/i.test(lower)) {
      return handleLostFoundFlow();
    }
    if (/search:|find |show me |list /i.test(lower)) {
      // use Algolia if configured
      if (algoliaIndex || (ALGOLIA_APP_ID && !ALGOLIA_APP_ID.includes('REPLACE'))) {
        return doAlgoliaSearch(text);
      }
    }

    // Otherwise ask HF (or fallback to training data)
    const thinking = showThinking();
    try {
      const prompt = `You are KabaleOnline Assistant. Use the information below to answer concisely.\n\nInfo:\n${kabaleData}\n\nUser: ${text}\nAssistant:`;
      let reply = '';
      try {
        reply = await callHF(prompt);
      } catch (e) {
        console.warn('HF failed, falling back to local FAQ.', e);
      }
      thinking.remove();
      if (!reply) {
        // Local fallback replies (FAQ)
        reply = localFaqAnswer(text) || "Sorry, I couldn't find an answer. Try asking about posting, rentals, services, or say 'help'.";
      }
      appendMsg(formatBotReply(reply), 'bot');
      saveChatToFirestore({ question: text, answer: reply }).catch(()=>{});
      sessionConv.push({ role: 'assistant', content: reply });
    } catch (err) {
      thinking.remove();
      console.error(err);
      appendMsg('⚠️ Sorry — an error occurred while contacting the AI service.', 'bot');
    }
  }

  /* ========== Feature handlers ========== */
  function localFaqAnswer(text) {
    const t = text.toLowerCase();
    if (t.includes('how') && t.includes('post')) {
      return 'To post an item: click Post Item, fill title, description, price, location, and photos. Then click Submit. You can also post via WhatsApp: click the message button.';
    }
    if (t.includes('contact') || t.includes('contact seller') || t.includes('whatsapp')) {
      return `Click here to message via WhatsApp: <a href="https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g,'')}" target="_blank" rel="noopener">Message on WhatsApp</a>`;
    }
    if (t.includes('cost') || t.includes('charge')) {
      return 'Posting is free on KabaleOnline. You may pay only if you opt for a featured listing (coming soon).';
    }
    return null;
  }

  async function doAlgoliaSearch(query) {
    await initAlgolia();
    const thinking = showThinking();
    try {
      const hits = await searchAlgolia(query, 6);
      thinking.remove();
      if (!hits || hits.length === 0) {
        appendMsg('No matching items found. Try a different keyword or browse Rentals/Services.', 'bot');
        return;
      }
      // render a short results list
      const lines = hits.map(h => {
        const title = escapeHtml(h.title || h.name || h.objectID || 'Untitled');
        const price = h.price ? ` — ${h.price}` : '';
        // assume each hit has 'url' or we can craft one
        const url = h.url || (`/item/${h.objectID}`);
        return `<div style="margin-bottom:8px"><strong>${title}</strong>${price}<br/><a href="${url}" target="_blank" rel="noopener">View</a></div>`;
      }).join('');
      appendMsg(`<div><strong>Search results:</strong><br/>${lines}</div>`, 'bot');
      return;
    } catch (e) {
      thinking.remove();
      appendMsg('Search error. Try again later.', 'bot');
    }
  }

  /* Guided flows (simple implementations, can be extended) */
  function handlePostFlow() {
    appendMsg('Great — let\'s post your item. Which category is it? (Items / Rentals / Services)', 'bot');
    // basic quick response handling — listen for next user input
    waitForNextAnswer().then(answer => {
      const cat = (answer || '').toLowerCase();
      if (cat.includes('rent')) {
        appendMsg('For rentals: provide title, location, price, and 1-3 photos. I can collect details and save a draft for you.', 'bot');
        // You can expand to collect fields and submit to Firestore or Netlify forms.
      } else if (cat.includes('service')) {
        appendMsg('For services: provide service title, hourly rate (if any), brief description, and contact details.', 'bot');
      } else {
        appendMsg('For items: provide title, condition, price, location, and photos. Type them now or go to the Post Item page.', 'bot');
      }
    });
  }

  function handleRentalFlow() {
    appendMsg('Okay — what is your budget and preferred area in Kabale?', 'bot');
    waitForNextAnswer().then(async answer => {
      if (!answer) { appendMsg('No problem — try keywords like "rooms near town under 100,000".', 'bot'); return; }
      // try Algolia search with user terms
      await doAlgoliaSearch(answer);
    });
  }

  function handleServiceFlow() {
    appendMsg('Which service do you need? (e.g., plumber, tutor, electrician)', 'bot');
    waitForNextAnswer().then(async answer => {
      if (!answer) { appendMsg('Try: plumber in Kabale town', 'bot'); return; }
      await doAlgoliaSearch(answer);
    });
  }

  function handleLostFoundFlow() {
    appendMsg('I can help with Lost & Found. Please describe the item and where it was lost/found.', 'bot');
    waitForNextAnswer().then(answer => {
      if (!answer) { appendMsg('You can also post via the Lost & Found section on the site.', 'bot'); return; }
      // Save to Firestore as a lost_found draft (optional)
      saveChatToFirestore({ question: 'Lost&Found: ' + answer, answer: 'Saved as lost & found draft' }).catch(()=>{});
      appendMsg('Thanks — your lost/found note is saved as a draft. Please visit the Lost & Found page to finalize.', 'bot');
    });
  }

  // wait for next user message (one-time promise)
  function waitForNextAnswer(timeoutMs = 120000) {
    return new Promise(resolve => {
      let done = false;
      function handler(e) {
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        appendMsg(escapeHtml(text), 'user');
        form.removeEventListener('submit', formHandler);
        done = true;
        resolve(text);
      }
      function formHandler(ev) { ev.preventDefault(); handler(); }
      form.addEventListener('submit', formHandler);
      // timeout
      setTimeout(() => { if (!done) { form.removeEventListener('submit', formHandler); resolve(null); } }, timeoutMs);
    });
  }

  function formatBotReply(t) {
    if (!t) return '';
    // linkify KabaleOnline post page mentions
    return t.replace(/https?:\/\/\S+/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`)
            .replace(/post item/ig, `<a href="https://www.kabaleonline.com/post" target="_blank" rel="noopener">Post Item</a>`);
  }

  /* ========== Event wiring ========== */
  toggle.addEventListener('click', () => {
    root.classList.toggle('ko-hidden');
    if (!root.classList.contains('ko-hidden') && bodyEl.children.length === 0) initChatUI();
  });
  closeBtn.addEventListener('click', () => root.classList.add('ko-hidden'));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    submitMessage(text);
  });

  // Start collapsed
  root.classList.add('ko-hidden');

  // Lazy init: load algolia (if provided) so search works quickly when needed
  initAlgolia().catch(()=>{});

})();