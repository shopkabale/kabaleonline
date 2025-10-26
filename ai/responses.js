// File: /ai/responses.js - FINAL EXPANDED VERSION

const responses = {
  // --- LIVE LOOKUP TRIGGERS (HIGHEST PRIORITY) ---
  "product_query": ["price of", "cost of", "how much is", "do you have", "what's the price of", "search for", "find me", "i'm looking for", "i need to find"],
  "category_electronics": ["electronics", "phone", "phones", "laptop", "laptops", "gadgets", "charger", "chargers", "speaker", "speakers", "computer", "tech", "power bank", "headphone", "headphones", "earphones", "earbuds", "smartwatch", "blender", "flat iron", "kettle"],
  "category_clothing": ["clothing", "clothes", "fashion", "apparel", "shoe", "shoes", "dress", "dresses", "shirt", "shirts", "jean", "jeans", "sneakers", "t-shirt", "footwear", "jacket", "hoodie", "sandals", "bag", "handbag", "suit"],
  "category_furniture": ["furniture", "home", "decor", "table", "tables", "chair", "chairs", "sofa", "sofas", "bed", "beds", "mattress", "furnishings", "desk", "wardrobe", "shelf", "cupboard"],
  "category_books": ["book", "books", "textbook", "textbooks", "novel", "novels", "revision", "past papers", "handout"],
  "category_kitchen": ["kitchen", "kitchenware", "utensils", "saucepan", "plate", "plates", "cup", "cups", "hot plate", "gas cooker"],

  // --- CORE CONVERSATIONAL ---
  "greetings": ["hi", "hello", "hey", "good morning", "good afternoon", "sup", "yo", "start", "what's up", "greetings", "how far"],
  "well_being": ["how are you", "how's it going", "are you ok", "how are you doing"],
  "bot_identity": ["who are you", "what are you", "are you a bot", "what's your name", "your name", "about yourself"],
  "gratitude": ["thanks", "thank you", "ok thanks", "nice", "great", "awesome", "cool", "good"],

  // --- CORE PLATFORM ACTIONS ---
  "sell": ["sell", "post an item", "listing", "advertise", "my product", "place ad", "upload", "upload item", "post an ad", "list an item", "put my stuff up", "how to sell", "sell my phone", "list my laptop", "how do i sell", "guide to selling", "how to post"],
  "buy": ["buy", "shop", "purchase", "looking for", "available", "i want", "browse items", "shopping", "find a product", "how to buy", "see items", "where can i find", "where can i get", "i need to buy", "guide to buying"],
  "rent": ["rent", "room", "house", "hostel", "apartment", "single room", "for rent", "rental", "shop space", "accommodation", "hostels", "find a hostel", "room to rent", "house for rent", "where to stay", "lodging", "need a room", "hostel around campus"],

  // --- TRANSACTION DETAILS ---
  "cost_of_selling": ["is selling free", "is it free to sell", "fees", "commission", "cost to sell", "does it cost to sell", "is kabaleonline free", "is selling on kabaleonline free", "charges", "listing fee"],
  "payment_methods": ["payment", "pay", "mobile money", "mtn", "airtel", "cash", "how do i pay", "payment options"],
  "delivery_options": ["delivery", "deliveries", "boda", "boda boda", "pickup", "drop", "send package", "courier", "parcel", "shipping", "how to get my item", "meet up"],
  "bargaining": ["negotiate", "bargain", "discount", "last price", "can i negotiate", "is the price final"],

  // --- ACCOUNT & LISTING MANAGEMENT ---
  "account_management": ["dashboard", "my account", "my profile", "account settings", "manage my listings", "my stuff", "my products", "my posts", "my dashboard", "change password", "delete account"],
  "how_to_edit": ["edit my item", "update my listing", "change my ad", "modify my post", "how to edit"],
  "how_to_delete": ["delete my item", "remove my listing", "take down my ad", "how to delete"],
  "mark_as_sold": ["mark as sold", "item is sold", "how to mark sold", "sold my item"],
  "photo_tips": ["photo tips", "better pictures", "how to take photos", "image advice", "good photos"],
  "pricing_advice": ["how much should I sell for", "pricing guide", "value my item", "what's the price of", "set a price"],

  // --- TRUST, SAFETY & SUPPORT ---
  "user_safety": ["safe", "safety", "secure", "scam", "fraud", "is it safe", "how to buy safely", "how to sell safely", "avoid scams", "report scam", "safety tips"],
  "disputes_returns": ["return policy", "can i return", "what if it's broken", "refund", "get my money back", "problem with seller", "item not as described", "complaint"],
  "contact": ["admin", "contact", "support", "problem", "issue", "report", "sensitive", "manager", "stuck", "bug", "talk to a person", "customer support", "report a user"],
  "technical_support": ["not working", "bug", "error", "website down", "can't upload", "login problem", "forgot password", "password reset"],
  "prohibited_items": ["what can't I sell", "prohibited", "banned items", "forbidden items", "rules for selling", "are there rules", "platform rules"],

  // --- COMMUNITY & PLATFORM INFO ---
  "about_platform": ["about", "what is kabaleonline", "info", "what is this", "introduction", "tell me about kabaleonline"],
  "mission_vision": ["mission", "vision", "purpose", "goal", "objective", "what are you trying to do", "your mission"],
  "founder": ["founder", "creator", "who made", "who runs", "ceo", "owner", "who created", "who is behind this"],
  "history_founded": ["when were you founded", "history", "how old", "when did you start", "founded on", "when was kabale online founded", "your story", "founded"],
  "events": ["event", "concert", "promotion", "show", "party", "what's happening", "gigs", "promote event", "sell tickets", "upcoming events"],
  "blog": ["blog", "read blog", "campus news", "updates", "stories", "articles", "news"],

  // --- GENERAL HELP ---
  "help": ["help", "guide", "how to", "assistance", "tutorial", "how do i", "where can i", "navigation", "site guide", "steps", "directions", "instructions", "how does this work", "i'm lost"]
};