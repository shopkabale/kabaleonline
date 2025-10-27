// File: /ai/responses.js (FINAL, CORRECTED, AND NON-CONFLICTING)

const responses = {
  // --- LIVE LOOKUP & REASONING TRIGGERS ---
  "product_query": ["price of", "cost of", "how much is", "do you have", "what's the price of", "search for", "find me", "i'm looking for", "show me", "can i see", "look up"],
  "price_check": ["is the price of", "is a price of", "isn't a price of", "is", "too high", "too low", "a good price", "is that price fair"],

  // --- NEW: UTILITY TRIGGERS ---
  "glossary_query": ["what is a", "what is an", "what's a", "what is", "what's", "what does", "define", "meaning of"],
  "delivery_estimate": ["how much to deliver", "delivery cost", "boda cost", "how much is delivery", "estimate delivery", "cost to send"],

  // --- NEW: PLATFORM ACTION TRIGGERS ---
  "start_upload": ["i want to sell", "i would like to sell", "sell my phone", "sell my laptop", "post an item for sale", "create a listing", "upload an item", "how to upload an item"],
  "manage_listings": ["show my listings", "my active listings", "what am i selling", "manage my items", "my posts"],
  "contact_seller": ["contact the seller", "message the seller", "ask the seller a question", "how do i contact the seller"],
  "mark_as_sold": ["mark my item as sold", "mark my phone as sold", "mark my laptop as sold"],

  // --- CATEGORIES ---
  "category_electronics": ["electronics", "phone", "phones", "laptop", "laptops", "gadgets", "charger", "chargers", "speaker", "speakers", "computer", "tech", "power bank", "headphone", "headphones", "earphones", "earbuds", "smartwatch", "blender", "flat iron", "kettle", "television", "tv", "camera", "gaming console", "ps5", "xbox", "router", "modem"],
  "category_clothing": ["clothing", "clothes", "fashion", "apparel", "shoe", "shoes", "dress", "dresses", "shirt", "shirts", "jean", "jeans", "sneakers", "t-shirt", "footwear", "jacket", "hoodie", "sandals", "bag", "handbag", "suit", "trousers", "skirt", "blouse", "sweater", "coat", "boots", "heels", "official wear"],
  "category_furniture": ["furniture", "home decor", "decor", "table", "tables", "chair", "chairs", "sofa", "sofas", "bed", "beds", "mattress", "furnishings", "desk", "wardrobe", "shelf", "cupboard", "couch", "bookcase", "cabinet", "stool", "office chair"],
  "category_books": ["book", "books", "textbook", "textbooks", "novel", "novels", "revision materials", "past papers", "handout", "fiction", "non-fiction", "magazine", "comic", "university handout", "lecture notes"],
  "category_kitchen": ["kitchen", "kitchenware", "utensils", "saucepan", "plate", "plates", "cup", "cups", "hot plate", "gas cooker", "cutlery", "forks", "spoons", "knives", "blender", "microwave", "fridge", "refrigerator"],

  // --- CORE CONVERSATIONAL ---
  "greetings": ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "sup", "yo", "start", "what's up", "greetings", "how far", "howdy", "hiya"],
  "well_being": ["how are you", "how's it going", "are you ok", "how are you doing", "how's everything", "you good?"],
  "bot_identity": ["who are you", "what are you", "are you a bot", "what's your name", "your name is", "about yourself", "tell me about you"],
  "gratitude": ["thanks", "thank you", "ok thanks", "nice", "great", "awesome", "cool", "good", "thank u", "much appreciated", "thanks a lot", "i appreciate it"],
  "affirmation": ["yes", "yep", "yeah", "sure", "ok", "okay", "correct", "of course", "y", "affirmative", "absolutely", "exactly", "deal", "do it"],
  "negation": ["no", "nope", "nah", "not really", "no thanks", "n", "negative", "i don't think so", "don't"],
  "cancel": ["cancel", "stop", "nevermind", "forget it", "quit", "exit"],

  // --- CORE PLATFORM INFO (No longer mixed with actions) ---
  "sell": ["how do i sell", "guide to selling", "how can i sell", "how to sell", "sell an item", "post an item", "listing", "advertise", "place ad", "post an ad", "list an item"],
  "buy": ["how do i buy", "how to buy", "how can i buy", "guide to buying", "buy", "shop", "purchase", "looking to buy", "i want to buy", "browse items", "shopping", "find a product", "see items", "where can i find", "where can i get", "i need to buy"],
  "rent": ["how do i rent", "find a rental", "rent", "room", "house", "hostel", "apartment", "single room", "for rent", "rental", "shop space", "accommodation", "hostels", "find a hostel", "room to rent", "house for rent", "where to stay", "lodging", "need a room", "hostel around campus"],
  "objectives": ["what are your objectives", "your objectives", "objectives", "goals", "aims" , "platform objectives", "goals", "aims", "what is your main goal"],

  // --- PROCESS-BASED "WHAT'S NEXT?" INTENTS ---
  "after_upload": ["after uploading my product", "after my ad is live", "i posted my item what next", "what should i do after posting", "i have listed my item now what", "my product is online what next"],
  "after_delivery": ["after making a delivery", "i delivered the item what now", "what should i do after a sale", "after a successful delivery", "i sold my item what's the next step", "how to complete a sale"],

  // --- CHITCHAT & PERSONALITY ---
  "chitchat_joke": ["tell me a joke", "make me laugh", "say something funny", "got any jokes?", "can you be funny", "tell me another joke"],
  "chitchat_weather": ["what's the weather like", "what's the weather", "how is the weather", "weather in kabale", "is it raining", "forecast"],
  "chitchat_time": ["what's the time", "what is the time", "do you have the time", "time now", "current time"],

  // --- ALL OTHER ORIGINAL INTENTS ---
  "cost_of_selling": ["is selling free", "is it free to sell", "fees", "commission", "cost to sell", "does it cost to sell", "is kabaleonline free", "is selling on kabaleonline free", "charges", "listing fee", "are there charges"],
  "payment_methods": ["payment", "pay", "mobile money", "mtn", "airtel", "cash", "how do i pay", "payment options", "can i pay with card"],
  "delivery_options": ["delivery", "deliveries", "boda", "boda boda", "pickup", "drop", "send package", "courier", "parcel", "shipping", "how to get my item", "meet up", "do you deliver"],
  "bargaining": ["negotiate", "bargain", "discount", "last price", "can i negotiate", "is the price final", "can i get a discount", "is it negotiable"],
  "account_management": ["dashboard", "my account", "my profile", "account settings", "manage my listings", "my stuff", "my products", "my posts", "my dashboard", "change password", "delete account"],
  "how_to_edit": ["how do i edit", "edit my item", "update my listing", "change my ad", "modify my post", "how to edit"],
  "how_to_delete": ["how do i delete", "delete my item", "remove my listing", "take down my ad", "how to delete"],
  "photo_tips": ["photo tips", "better pictures", "how to take photos", "image advice", "good photos", "tips for photos"],
  "pricing_advice": ["how much should I sell for", "pricing guide", "value my item", "what's the worth of", "set a price", "how to price"],
  "user_safety": ["safe", "safety", "secure", "scam", "fraud", "is it safe", "how to buy safely", "how to sell safely", "avoid scams", "report scam", "safety tips"],
  "disputes_returns": ["return policy", "can i return", "what if it's broken", "refund", "get my money back", "problem with seller", "item not as described", "complaint", "dispute"],
  "contact": ["admin", "contact", "support", "problem", "issue", "report", "sensitive", "manager", "stuck", "bug", "talk to a person", "customer support", "report a user", "need human help"],
  "technical_support": ["not working", "bug", "error", "website down", "can't upload", "login problem", "forgot password", "password reset", "technical issue", "upload issues", "login issues", "site is broken"],
  "prohibited_items": ["what can't I sell", "prohibited", "banned items", "forbidden items", "rules for selling", "are there rules", "platform rules", "what is not allowed"],
  "dashboard": ["dashboard", "my dashboard", "go to my dashboard", "show me my dashboard"],
  "orders": ["orders", "my orders", "track my order", "order status", "purchase history", "delivery status", "where is my item"],
  "wishlist": ["wishlist", "my wishlist", "saved items", "favorites", "saved for later", "favourite"],
  "cart": ["cart", "my cart", "shopping cart", "basket", "checkout", "in my cart"],
  "inbox": ["inbox", "my inbox", "messages", "notifications", "check messages", "my messages"],
  "requests": ["requests", "user requests", "request an item", "can't find", "looking for something", "i need a"],
  "feedback": ["feedback", "testimonial", "leave a review", "share feedback", "rate my experience", "suggestion", "compliment"],
  "about_platform": ["about", "what is kabaleonline", "info", "what is this", "introduction", "tell me about kabaleonline", "what does this site do"],
  "mission_vision": ["mission", "vision", "purpose", "goal", "objective", "what are you trying to do", "your mission"],
  "founder": ["founder", "creator", "who made", "who runs", "ceo", "owner", "who created", "who is behind this"],
  "history_founded": ["when were you founded", "history", "how old", "when did you start", "founded on", "when was kabale online founded", "your story", "founded"],
  "events": ["event", "concert", "promotion", "show", "party", "what's happening", "gigs", "promote event", "sell tickets", "upcoming events"],
  "blog": ["blog", "read blog", "campus news", "updates", "stories", "articles", "news"],
  "lost": ["lost an item", "found an item", "lost my", "found a", "report lost", "misplaced", "lost my id", "found a phone", "missing document"],
  "seller_unresponsive": ["seller not responding", "seller won't reply", "no response from seller", "can't reach the seller"],
  "jobs": ["job", "work", "employment", "hiring", "vacancy", "internship", "career", "job posting", "employment opportunities", "find work", "get a job", "are you hiring"],
  "help": ["help", "guide", "assistance", "tutorial", "site navigation", "site guide", "general steps", "directions", "instructions", "how does this work", "i'm lost", "can you help me"]
};