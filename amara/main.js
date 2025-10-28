// File: /ai/chatbot.js (The Definitive, Final, and Corrected Version)

document.addEventListener('DOMContentLoaded', function () {
  if (typeof auth === 'undefined' || typeof db === 'undefined' || typeof doc === 'undefined' || typeof getDoc === 'undefined' || typeof addDoc === 'undefined' || typeof collection === 'undefined' || typeof serverTimestamp === 'undefined' || typeof updateDoc === 'undefined' || typeof sendSignInLinkToEmail === 'undefined') {
    console.error("Amara AI FATAL ERROR: Firebase v9 objects are not globally available. The script cannot run.");
    return;
  }

  const SESSION_STATE_KEY = 'kabale_session_state_v1';
  const SEARCH_HISTORY_KEY = 'kabale_search_history_v1';
  const GOOGLE_FORM_ACTION_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeSg2kFpCm1Ei4gXgNH9zB_p8tuEpeBcIP9ZkKjIDQg8IHnMg/formResponse";
  const USER_MESSAGE_ENTRY_ID = "entry.779723602";
  const RESPONSE_GIVEN_ENTRY_ID = "entry.2015145894";
  const PROMOTIONAL_MESSAGE = "This week, enjoy featured listings for all hostel rooms!";
  let exitIntentTriggered = false;

  const chatBody = document.getElementById('ko-body');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');
  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  let sessionState = {
    userName: null,
    currentContext: null,
    lastResponseKey: null,
    lastResponseIndex: null,
    pendingAction: null,
    conversationState: null
  };

  const actionCodeSettings = {
    url: `${window.location.origin}/dashboard/`,
    handleCodeInApp: true,
  };

  function nowTime() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function safeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function capitalize(s) { if (!s) return ''; return s.charAt(0).toUpperCase() + s.slice(1); }
  function loadState() { try { const s = localStorage.getItem(SESSION_STATE_KEY); if(s) sessionState.userName = JSON.parse(s).userName||null; } catch(e){} }
  function saveState() { try { localStorage.setItem(SESSION_STATE_KEY, JSON.stringify({userName: sessionState.userName})); } catch(e){} }
  function getSearchHistory() { try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || []; } catch { return []; } }
  function saveSearchHistory(term) { let h=getSearchHistory(); if(!h.includes(term)){h.unshift(term);localStorage.setItem(SEARCH_HISTORY_KEY,JSON.stringify(h.slice(0,3)));}}
  
  function isUserLoggedIn() { return auth.currentUser; }

  function scrollToBottom() { if(chatBody) chatBody.scrollTop = chatBody.scrollHeight; }
  
  function showThinking() { const w=document.createElement('div'); w.className='message-wrapper received-wrapper thinking-indicator-wrapper'; w.innerHTML=`<div class="avatar"><i class="fa-solid fa-robot"></i></div><div class="thinking-indicator"><i class="fa-solid fa-gear"></i> Thinking...</div>`; chatMessages.appendChild(w); scrollToBottom(); return w; }
  
  function showTyping() { const w=document.createElement('div'); w.className='message-wrapper received-wrapper typing-indicator-wrapper'; w.innerHTML=`<div class="avatar"><i class="fa-solid fa-robot"></i></div><div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`; chatMessages.appendChild(w); scrollToBottom(); return w; }
  
  function appendMessage(content, type) {
    const time = nowTime();
    const wrapper = document.createElement('div');
    wrapper.classList.add('message-wrapper', `${type}-wrapper`);
    let text = (type === 'received' && typeof content === 'object') ? content.text : content;
    if (text === undefined) text = "I didn't catch that. Can you say it differently?";
    if (sessionState.userName) { text = text.replace(/\${userName}/g, sessionState.userName); }
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
  
  function createActionButton(text, onClick) {
      const sc = document.createElement('div');
      sc.className = 'suggestions-container';
      const b = document.createElement('button');
      b.className = 'suggestion-chip';
      b.style.backgroundColor = 'var(--ko-primary)';
      b.style.color = 'white';
      b.style.borderColor = 'var(--ko-primary)';
      b.textContent = text;
      b.onclick = onClick;
      sc.appendChild(b);
      chatMessages.lastChild.appendChild(sc);
  }

  function normalizeWhatsAppNumber(number) {
    let cleaned = number.replace(/\s+/g, '');
    if (cleaned.startsWith('0')) cleaned = '256' + cleaned.substring(1);
    if (!cleaned.startsWith('256')) cleaned = '256' + cleaned;
    return cleaned;
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

  async function callAPIFunction(endpoint, { body, token } = {}) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`/.netlify/functions/${endpoint}`, { 
            method: 'POST', 
            headers: headers,
            body: body ? JSON.stringify(body) : null
        });
        if (!res.ok) throw new Error(`Server returned an error for ${endpoint}`);
        return await res.json();
    } catch (err) {
        console.error(`Fatal: ${endpoint} API fetch failed.`, err);
        return { text: "Sorry, I'm having trouble connecting to the database right now." };
    }
  }
  
  function logUnknownQuery(item) {
    const queryParams = new URLSearchParams({ [USER_MESSAGE_ENTRY_ID]: item.question, [RESPONSE_GIVEN_ENTRY_ID]: item.answer });
    const submitUrl = `${GOOGLE_FORM_ACTION_URL}?${queryParams.toString()}`;
    const img = new Image();
    img.src = submitUrl;
  }

  function solveMathExpression(expression) {
    try {
        let cleanExpression = expression.toLowerCase().replace(/,/g, '').replace(/x/g, '*').replace(/what is|is|calculate|compute/g, '').trim();
        const percentMatch = cleanExpression.match(/(\d+\.?\d*)\s*(?:percent|%)\s*of\s*(\d+\.?\d*)/);
        if (percentMatch) {
            const percentage = parseFloat(percentMatch[1]);
            const number = parseFloat(percentMatch[2]);
            return (percentage / 100) * number;
        }
        if (/^[\d\s\.\+\-\*\/\(\)]+$/.test(cleanExpression)) { return new Function('return ' + cleanExpression)(); }
        return null;
    } catch (error) {
        console.error("Calculation Error:", error);
        return null;
    }
  }

  function estimateDeliveryCost(from, to) {
      from = from.toLowerCase().trim();
      to = to.toLowerCase().trim();
      if (answers.delivery_zones && answers.delivery_zones[from] && answers.delivery_zones[from][to]) { return answers.delivery_zones[from][to]; }
      return null;
  }
  
  function cleanSearchQuery(text) {
    const stopWords = ['a', 'an', 'the', 'is', 'are', 'one', 'some', 'for'];
    const regex = new RegExp(`\\b(${stopWords.join('|')})\\b`, 'gi');
    return text.replace(regex, '').replace(/\s\s+/g, ' ').trim();
  }
  
  function isNewTopic(text) {
      const lc = text.toLowerCase();
      const newTopicKeywords = ['how', 'what', 'who', 'when', 'where', 'why', 'is', 'can', 'do', 'tell', 'show', 'sell', 'buy', 'rent'];
      if (newTopicKeywords.some(keyword => lc.startsWith(keyword))) {
          return true;
      }
      return false;
  }

  function detectIntent(userText) {
    const lc = userText.toLowerCase();
    if (sessionState.conversationState) { return { intent: 'continue_conversation' }; }
    if (sessionState.pendingAction) {
        if ((responses.affirmation || []).some(k => new RegExp(`\\b${safeRegex(k)}\\b`, 'i').test(lc))) return { intent: 'affirmation' };
        if ((responses.negation || []).some(k => new RegExp(`\\b${safeRegex(k)}\\b`, 'i').test(lc))) return { intent: 'negation' };
    }
    
    if ((responses.user_safety || []).some(k => lc.includes(k))) return { intent: 'user_safety' };
    if ((responses.founder || []).some(k => lc.includes(k))) return { intent: 'founder' };
    if ((responses.mission_vision || []).some(k => lc.includes(k))) return { intent: 'mission_vision' };
    
    const deliveryMatch = lc.match(/delivery from\s+([a-zA-Z]+)\s+to\s+([a-zA-Z]+)/);
    if (deliveryMatch) return { intent: 'estimate_delivery', entities: { from: deliveryMatch[1], to: deliveryMatch[2] } };
    
    const mathRegex = /(([\d,.]+)\s*(?:percent|%)\s*of\s*([\d,.]+))|([\d,.\s]+[\+\-\*\/x][\d,.\s]+)/;
    if ((lc.startsWith("calculate") || mathRegex.test(lc)) && !lc.startsWith("what is")) {
        if (solveMathExpression(lc) !== null) return { intent: 'calculate', entities: { expression: lc } };
    }
    
    for (const trigger of (responses.product_query || [])) {
        if (lc.startsWith(trigger)) {
            let productName = cleanSearchQuery(userText.substring(trigger.length).trim());
            if (productName) { saveSearchHistory(productName); return { intent: 'search_product', entities: { productName } }; }
        }
    }

    const priceMatch = lc.match(/(?:is|price of)\s+([\d,]+(?:,\d{3})*)\s+(too high|too low|a good price|fair)/);
    if (priceMatch && priceMatch[1]) { return { intent: 'price_check', entities: { price: parseInt(priceMatch[1].replace(/,/g, '')) } }; }
    const nameMatch = lc.match(/^(?:my name is|call me|i'm|i am|am)\s+([a-zA-Z]+)\s*$/);
    if (nameMatch && nameMatch[1]) { return { intent: 'set_name', entities: { name: capitalize(nameMatch[1]) } }; }
    
    const coreActionKeys = ['start_upload', 'buy', 'rent', 'help', 'contact', 'after_upload', 'after_delivery', 'manage_listings', 'signup', 'login'];
    for (const key of coreActionKeys) {
        for (const keyword of (responses[key] || [])) { if (new RegExp(`\\b${safeRegex(keyword)}\\b`, 'i').test(lc)) return { intent: key }; }
    }

    const markSoldMatch = lc.match(/mark my\s+([a-zA-Z0-9\s]+)\s+as sold/);
    if (markSoldMatch) return { intent: 'mark_as_sold', entities: { item: markSoldMatch[1] } };

    for (const key in responses) {
        const isHandled = key.startsWith("category_") || key.startsWith("chitchat_") || coreActionKeys.includes(key) || ['product_query', 'price_check', 'affirmation', 'negation', 'gratitude', 'greetings', 'sell', 'start_upload', 'glossary_query', 'delivery_options', 'user_safety', 'calculate', 'delivery_estimate', 'founder', 'mission_vision'].includes(key);
        if (isHandled) continue;
        for (const keyword of (responses[key] || [])) { if (new RegExp(`\\b${safeRegex(keyword)}\\b`, 'i').test(lc)) { return { intent: key }; } }
    }
    
    if ((responses.delivery_options || []).some(k => lc.includes(k))) return { intent: 'delivery_options' };
    
    for (const trigger of (responses.glossary_query || [])) {
        if (lc.startsWith(trigger)) {
            let term = userText.substring(trigger.length).trim().replace(/['"`]/g, '').toLowerCase();
            if (term) return { intent: 'ask_glossary', entities: { term } };
        }
    }
    
    for (const key in responses) {
        if (key.startsWith("category_")) {
            for (const keyword of (responses[key] || [])) {
                if (new RegExp(`\\b${safeRegex(keyword)}\\b`, 'i').test(lc)) {
                    let categoryName = capitalize(key.replace("category_", ""));
                    if (categoryName === 'Clothing') categoryName = 'Clothing & Apparel';
                    if (categoryName === 'Furniture') categoryName = 'Home & Furniture';
                    return { intent: 'search_category', entities: { categoryName } };
                }
            }
        }
    }
    for (const key in responses) {
        if (key.startsWith("chitchat_") || ['gratitude', 'well_being', 'bot_identity', 'greetings'].includes(key)) {
            for (const keyword of (responses[key] || [])) { if (new RegExp(`\\b${safeRegex(keyword)}\\b`, 'i').test(lc)) { return { intent: key }; } }
        }
    }
    
    if ((responses.sell || []).some(k => lc.includes(k))) return { intent: 'sell' };

    return { intent: 'unknown' };
  }

  async function generateReply(userText) {
    const lc = userText.toLowerCase();
    if (sessionState.conversationState) {
        if (responses.cancel.some(k => lc.includes(k))) {
            sessionState.conversationState = null; return answers.conversation_cancelled;
        }
        if (sessionState.conversationState.type === 'product_upload') {
            const { step, data } = sessionState.conversationState;
            switch (step) {
                case 'get_title':       data.title = userText; sessionState.conversationState.step = 'get_description'; return answers.upload_flow.get_title;
                case 'get_description': data.description = userText; sessionState.conversationState.step = 'get_price'; return answers.upload_flow.get_description;
                case 'get_price':       const price = parseInt(userText.replace(/,/g, '')); if (isNaN(price)) return { text: "That doesn't look like a valid price. Please enter a number, like 50000." }; data.price = price; sessionState.conversationState.step = 'get_category'; return answers.upload_flow.get_price;
                case 'get_category':    data.category = userText; sessionState.conversationState.step = 'get_whatsapp'; return answers.upload_flow.get_category;
                case 'get_whatsapp':    data.whatsapp = userText; sessionState.conversationState.step = 'get_photo'; return { ...answers.upload_flow.get_whatsapp, action: 'prompt_upload' };
            }
        }
        if (sessionState.conversationState.type === 'login') {
            const email = userText.trim();
            sessionState.conversationState = null;
            if (email.includes('@')) {
                try {
                    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
                    window.localStorage.setItem('emailForSignIn', email);
                    return answers.login_flow.finish;
                } catch (error) {
                    console.error("Send sign-in link error:", error);
                    return { text: "I'm sorry, I couldn't send the login link. Please make sure the email is correct and try again." };
                }
            } else {
                return { text: "That doesn't look like a valid email. Please provide a correct email address." };
            }
        }
        if (sessionState.conversationState.type === 'mark_as_sold') {
            const productName = userText.trim();
            const user = isUserLoggedIn();
            sessionState.conversationState = null;
            if (!user) return answers.user_not_logged_in;
            const token = await user.getIdToken();
            return await callAPIFunction('update-listing-status', { token, body: { productName, newStatus: { isSold: true } } });
        }
        return;
    }
    
    const { intent, entities } = detectIntent(userText);

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

    const followUpPhrases = ["what about", "what of", "how about", "and for", "are there any"];
    if (sessionState.currentContext && followUpPhrases.some(p => lc.startsWith(p))) {
        let newKeywordsRaw = userText.replace(new RegExp(`^(${followUpPhrases.join('|')})\\s*`, 'i'), '').trim();
        if (isNewTopic(newKeywordsRaw)) {
            sessionState.currentContext = null; 
        } else {
            let newKeywords = cleanSearchQuery(newKeywordsRaw);
            let combinedQuery = `${newKeywords} ${sessionState.currentContext.value}`;
            return await callAPIFunction('product-lookup', { body: { productName: combinedQuery } });
        }
    }
    
    if (!followUpPhrases.some(p => lc.startsWith(p))) {
        sessionState.currentContext = null;
    }
    
    switch (intent) {
        case 'start_upload': if (!isUserLoggedIn()) return answers.user_not_logged_in; sessionState.pendingAction = 'confirm_upload'; return answers.prompt_upload_conversation;
        case 'manage_listings': const user = isUserLoggedIn(); if (!user) return answers.user_not_logged_in; const token = await user.getIdToken(); return await callAPIFunction('user-listings', { token });
        case 'mark_as_sold': if (!isUserLoggedIn()) return answers.user_not_logged_in; sessionState.conversationState = { type: 'mark_as_sold' }; return answers.mark_as_sold_flow.start;
        case 'login': if (isUserLoggedIn()) return { text: "You are already logged in!" }; sessionState.conversationState = { type: 'login' }; return answers.login_flow.start;
        case 'signup': return { text: 'I can help with that! To keep your information safe, the best way to create an account is on our secure signup page. <a href="/signup/" target="_blank">Click here to get started.</a>' };
        case 'calculate': const result = solveMathExpression(entities.expression); return { text: `The result is <b>${result.toLocaleString()}</b>.` };
        case 'ask_glossary': const definition = answers.glossary[entities.term]; return definition ? { text: `<b>${capitalize(entities.term)}:</b> ${definition}` } : answers.glossary_not_found;
        case 'estimate_delivery': const cost = estimateDeliveryCost(entities.from, entities.to); return cost ? { text: `The estimated boda boda cost from ${capitalize(entities.from)} to ${capitalize(entities.to)} is around <b>UGX ${cost.toLocaleString()}</b>.` } : answers.delivery_estimate_error;
        case 'search_product': return await callAPIFunction('product-lookup', { body: { productName: entities.productName } });
        case 'search_category': return await callAPIFunction('product-lookup', { body: { categoryName: entities.categoryName } });
        case 'set_name': sessionState.userName = entities.name; saveState(); return answers.confirm_name_set;
        case 'price_check': const priceVal = entities.price; let responseText = `Regarding a price of UGX ${priceVal.toLocaleString()}:<br>`; if (priceVal > 1000000) { responseText += "That's a high-ticket item! I'd recommend meeting the seller in a very public place and verifying everything carefully before paying."; } else if (priceVal > 200000) { responseText += "That's a significant amount. Be sure to inspect it thoroughly."; } else if (priceVal < 20000) { responseText += "That seems like a great deal! Just make sure the item's condition matches the description."; } else { responseText += "That seems like a pretty standard price for many items here."; } return { text: responseText, suggestions: ["Safety tips", "How do I buy?", "Find me a laptop"] };
        default:
            if (intent !== 'unknown' && answers[intent]) {
                if (intent === sessionState.lastResponseKey && !intent.startsWith('chitchat_')) { 
                    return { text: "We just talked about that. Is there something specific I can clarify?", suggestions: ["Help", "Contact support"] }; 
                }
                sessionState.lastResponseKey = intent;
                const potentialReplies = answers[intent];
                if (Array.isArray(potentialReplies)) {
                    let nextIndex = Math.floor(Math.random() * potentialReplies.length);
                    if (potentialReplies.length > 1 && nextIndex === sessionState.lastResponseIndex) {
                        nextIndex = (nextIndex + 1) % potentialReplies.length;
                    }
                    sessionState.lastResponseIndex = nextIndex;
                    return potentialReplies[nextIndex];
                } else {
                    sessionState.lastResponseIndex = null;
                    return potentialReplies;
                }
            }
            
            const externalSearchResult = await callAPIFunction('external-search', { body: { query: userText } });
            if (externalSearchResult && externalSearchResult.text) {
                return externalSearchResult;
            }

            sessionState.lastResponseKey = 'fallback';
            const fallbackResponse = { text: `I'm still learning and don't have information on that yet. You can try asking differently.`, suggestions: ["How to sell", "Find a hostel", "Is selling free?"] };
            logUnknownQuery({ question: userText, answer: fallbackResponse.text });
            return fallbackResponse;
    }
  }
  
  function initialize() {
    loadState();
    let initialGreeting;
    const searchHistory = getSearchHistory();
    if (sessionState.userName && searchHistory.length > 0) {
        initialGreeting = { text: `👋 Welcome back, ${sessionState.userName}! Still looking for a <b>${searchHistory[0]}</b>? I can search for new listings for you.`, suggestions: [`Find me a ${searchHistory[0]}`, "Help"] };
    } else if (sessionState.userName) { 
        initialGreeting = { text: `👋 Welcome back, ${sessionState.userName}! How can I help you today?`, suggestions: answers.greetings[0].suggestions }; 
    } else { 
        const hour = new Date().getHours();
        let timeBasedText;
        if (hour < 12) { timeBasedText = "☀️ Good morning! I'm Amara. How can I help you?"; } 
        else if (hour < 18) { timeBasedText = "👋 Good afternoon! I'm Amara, ready to help."; } 
        else { timeBasedText = "🌙 Good evening! I'm Amara, here to assist!"; }
        initialGreeting = { text: timeBasedText, suggestions: answers.greetings[0].suggestions }; 
    }
    if (PROMOTIONAL_MESSAGE) { initialGreeting.text = `<b>${PROMOTIONAL_MESSAGE}</b><br><br>${initialGreeting.text}`; }
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
          if (chatMessages.children.length <= 1) { appendMessage(answers.exit_intent, 'received'); }
      }
  });

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
      if (reply.action === 'prompt_upload') {
        createActionButton("Click to Upload Photo", () => fileInput.click());
      }
    }
  }
  
  chatForm.addEventListener('submit', (e) => { e.preventDefault(); handleSend(messageInput.value); });

  initialize();
});