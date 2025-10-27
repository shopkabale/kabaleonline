// Replace your entire /ai/responses.js file with this content

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

  "gratitude": ["thanks", "thank you", "ok thanks", "nice", "great", "awesome", "cool", "good", "thank u"],

  // --- CORE PLATFORM ACTIONS (Specific phrases have high priority) ---
  "sell": ["how do i sell", "guide to selling", "how can i sell" , "how to post", "how to sell" , "i want to sell", "i would like to sell", "sell an item", "post an item", "listing", "advertise", "place ad", "upload item", "post an ad", "list an item"],

  "buy": ["how do i buy", "how to buy" , "how can I buy " ,  "guide to buying", "buy", "shop", "purchase", "looking for", "available", "i want", "browse items", "shopping", "find a product", "see items", "where can i find", "where can i get", "i need to buy"],

  "rent": ["how do i rent", "find a rental", "rent", "room", "house", "hostel", "apartment", "single room", "for rent", "rental", "shop space", "accommodation", "hostels", "find a hostel", "room to rent", "house for rent", "where to stay", "lodging", "need a room", "hostel around campus"],

  // --- TRANSACTION DETAILS ---
  "cost_of_selling": ["is selling free", "is it free to sell", "fees", "commission", "cost to sell", "does it cost to sell", "is kabaleonline free", "is selling on kabaleonline free", "charges", "listing fee"],

  "payment_methods": ["payment", "pay", "mobile money", "mtn", "airtel", "cash", "how do i pay", "payment options"],

  "delivery_options": ["delivery", "deliveries", "boda", "boda boda", "pickup", "drop", "send package", "courier", "parcel", "shipping", "how to get my item", "meet up"],

  "bargaining": ["negotiate", "bargain", "discount", "last price", "can i negotiate", "is the price final"],

  // --- ACCOUNT & LISTING MANAGEMENT ---
  "account_management": ["dashboard", "my account", "my profile", "account settings", "manage my listings", "my stuff", "my products", "my posts", "my dashboard", "change password", "delete account"],

  "how_to_edit": ["how do i edit", "edit my item", "update my listing", "change my ad", "modify my post", "how to edit"],

  "how_to_delete": ["how do i delete", "delete my item", "remove my listing", "take down my ad", "how to delete"],

  "mark_as_sold": ["how do i mark as sold", "mark as sold", "item is sold", "how to mark sold", "sold my item"],

  "photo_tips": ["photo tips", "better pictures", "how to take photos", "image advice", "good photos"],

  "pricing_advice": ["how much should I sell for", "pricing guide", "value my item", "what's the worth of", "set a price", "how to price"],

  // --- TRUST, SAFETY & SUPPORT ---
  "user_safety": ["safe", "safety", "secure", "scam", "fraud", "is it safe", "how to buy safely", "how to sell safely", "avoid scams", "report scam", "safety tips"],

  "disputes_returns": ["return policy", "can i return", "what if it's broken", "refund", "get my money back", "problem with seller", "item not as described", "complaint", "dispute"],

  "contact": ["admin", "contact", "support", "problem", "issue", "report", "sensitive", "manager", "stuck", "bug", "talk to a person", "customer support", "report a user"],

  "technical_support": ["not working", "bug", "error", "website down", "can't upload", "login problem", "forgot password", "password reset", "technical issue", "upload issues", "login issues"],

  "prohibited_items": ["what can't I sell", "prohibited", "banned items", "forbidden items", "rules for selling", "are there rules", "platform rules"],

  // --- PLATFORM FEATURES ---
  "dashboard": ["dashboard", "my account", "my profile", "account settings", "manage my listings", "my stuff", "my products", "my posts", "my dashboard"],

  "orders": ["orders", "my orders", "track my order", "order status", "purchase history", "delivery status", "where is my item"],
  "wishlist": ["wishlist", "my wishlist", "saved items", "favorites", "saved for later", "favourite"],

  "cart": ["cart", "my cart", "shopping cart", "basket", "checkout", "in my cart"],
  "inbox": ["inbox", "my inbox", "messages", "notifications", "check messages", "my messages"],

  "requests": ["requests", "user requests", "request an item", "can't find", "looking for something", "i need a"],

  "feedback": ["feedback", "testimonial", "leave a review", "share feedback", "rate my experience", "suggestion", "compliment"],

  // --- COMMUNITY & PLATFORM INFO ---
  "about_platform": ["about", "what is kabaleonline", "info", "what is this", "introduction", "tell me about kabaleonline"],

  "mission_vision": ["mission", "vision", "purpose", "goal", "objective", "what are you trying to do", "your mission"],

  "founder": ["founder", "creator", "who made", "who runs", "ceo", "owner", "who created", "who is behind this"],

  "history_founded": ["when were you founded", "history", "how old", "when did you start", "founded on", "when was kabale online founded", "your story", "founded"],

  "events": ["event", "concert", "promotion", "show", "party", "what's happening", "gigs", "promote event", "sell tickets", "upcoming events"],

  "blog": ["blog", "read blog", "campus news", "updates", "stories", "articles", "news"],

  "lost": ["lost an item", "found an item", "lost my", "found a", "report lost", "misplaced", "lost my id", "found a phone", "missing document"],

  "seller_unresponsive": ["seller not responding", "seller won't reply", "no response from seller", "can't reach the seller"],

  "jobs": ["job", "work", "employment", "hiring", "vacancy", "internship", "career", "job posting", "employment opportunities", "find work", "get a job", "are you hiring"],

  "services": ["service", "plumber", "electrician", "mechanic", "freelancer", "photographer", "tutor", "dj", "boda boda", "offer service", "hire service", "find a plumber", "need a boda", "professional"],

  // --- GENERAL HELP (No longer contains "how to" or "how do I") ---
  "help": ["help", "guide", "assistance", "tutorial", "where can i find", "site navigation", "site guide", "general steps", "directions", "instructions", "how does this work", "i'm lost"]
};