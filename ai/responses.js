const responses = {
  // --- CONVERSATIONAL ---
  "greetings": ["hi", "hello", "hey", "good morning", "good afternoon", "sup", "yo", "start", "what's up", "greetings"],
  "well_being": ["how are you", "how's it going", "are you ok", "how are you doing"],
  "bot_identity": ["who are you", "what are you", "are you a bot", "what's your name", "your name"], // Separated from "about"



  


  // --- CORE FEATURES (EXISTING & REFINED) ---
  "rent": ["rent", "room", "house", "hostel", "apartment", "single room", "for rent", "rental", "shop space", "accommodation", "hostels", "find a hostel", "room to rent", "house for rent", "where to stay", "lodging"],
  "sell": ["sell", "post an item", "listing", "advertise", "my product", "place ad", "upload", "upload item", "post an ad", "list an item", "put my stuff up", "how to sell", "sell my phone", "list my laptop"],
  "buy": ["buy", "shop", "purchase", "looking for", "available", "i want", "browse items", "shopping", "find a product", "how to buy", "see items", "where can i find"],
  "lost": ["lost an item", "found an item", "lost my", "found a", "report lost", "misplaced", "lost my id", "found a phone", "missing document"],
  "jobs": ["job", "work", "employment", "hiring", "vacancy", "internship", "career", "job posting", "employment opportunities", "find work", "get a job", "are you hiring"],
  "services": ["service", "plumber", "electrician", "mechanic", "freelancer", "photographer", "tutor", "dj", "boda boda", "offer service", "hire service", "find a plumber", "need a boda", "professional"],

  // --- NEW: SELLING DETAILS ---
  "cost_of_selling": ["is selling free", "is it free to sell", "fees", "commission", "cost to sell", "does it cost to sell", "is kabaleonline free", "is selling on kabaleonline free"],
  "how_to_edit": ["edit my item", "update my listing", "change my ad", "modify my post", "how to edit"],
  "how_to_delete": ["delete my item", "remove my listing", "take down my ad", "how to delete"],
  "mark_as_sold": ["mark as sold", "item is sold", "how to mark sold", "sold my item"],
  "photo_tips": ["photo tips", "better pictures", "how to take photos", "image advice", "good photos"],

  // --- NEW: RULES & POLICIES ---
  "prohibited_items": ["what can't I sell", "prohibited", "banned items", "forbidden items", "rules for selling", "are there rules"],
  "return_policy": ["return policy", "can i return", "what if it's broken", "refund", "get my money back"],
  "user_safety": ["safe", "safety", "secure", "scam", "fraud", "is it safe", "how to buy safely", "how to sell safely", "avoid scams", "report scam"], // Merged from "safety"

  // --- NEW: TROUBLESHOOTING ---
  "seller_unresponsive": ["seller not responding", "seller won't reply", "no response from seller", "can't reach the seller"],
  "login_issues": ["can't log in", "forgot password", "password reset", "login problem", "trouble logging in"],
  "upload_issues": ["photo won't upload", "can't upload picture", "image error", "upload failed"],

  // --- PLATFORM FEATURES (EXISTING) ---
  "dashboard": ["dashboard", "my account", "my profile", "account settings", "manage my listings", "my stuff", "my products", "my posts", "my dashboard"],
  "orders": ["orders", "my orders", "track my order", "order status", "purchase history", "delivery status", "where is my item"],
  "wishlist": ["wishlist", "my wishlist", "saved items", "favorites", "saved for later", "favourite"],
  "cart": ["cart", "my cart", "shopping cart", "basket", "checkout", "in my cart"],
  "inbox": ["inbox", "my inbox", "messages", "notifications", "check messages", "my messages"],
  "requests": ["requests", "user requests", "request an item", "can't find", "looking for something", "i need a"],
  "feedback": ["feedback", "testimonial", "leave a review", "share feedback", "rate my experience", "suggestion", "compliment"],
  "blog": ["blog", "read blog", "campus news", "updates", "stories", "articles", "news"],

  // --- KABALE ONLINE INFO (REFINED) ---
  "about_platform": ["about", "what is kabaleonline", "info", "what is this", "introduction", "tell me about kabaleonline"], // Now specifically about the platform
  "mission_vision": ["mission", "vision", "purpose", "goal", "objective", "what are you trying to do", "your mission"],
  "founder": ["founder", "creator", "who made", "who runs", "ceo", "owner", "who created", "who is behind this"],
  "history_founded": ["when were you founded", "history", "how old", "when did you start", "founded on", "when was kabale online founded", "your story", "founded"],
  "contact": ["admin", "contact", "support", "problem", "issue", "report", "sensitive", "manager", "stuck", "bug", "complaint", "talk to a person", "customer support", "report a user", "problem with seller"],

  // --- CATEGORIES & PRODUCT TRIGGERS (EXISTING) ---
  "category_electronics": ["electronics", "phones", "laptops", "gadgets", "chargers", "speakers", "computer", "tech"],
  "category_clothing": ["clothing", "clothes", "fashion", "apparel", "shoes", "dresses", "shirts", "jeans", "sneakers", "t-shirt", "footwear"],
  "category_furniture": ["furniture", "home", "decor", "tables", "chairs", "sofas", "bed", "mattress", "furnishings"],

  // --- OTHER (EXISTING & REFINED) ---
  "deliveries": ["delivery", "deliveries", "boda", "pickup", "drop", "send package", "courier", "parcel", "shipping"],
  "events": ["event", "concert", "promotion", "show", "party", "what's happening", "gigs", "promote event", "sell tickets", "upcoming events"],
  "help": ["help", "guide", "how to", "assistance", "tutorial", "how do i", "where can i", "navigation", "site guide", "steps", "directions", "instructions", "how does this work", "i'm lost"]
};