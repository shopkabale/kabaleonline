// File: /ai/answers.js (FINAL AND COMPLETE)

// ⭐ NEW: GLOSSARY DATABASE ⭐
const glossary = {
    "retake": "In university, a 'retake' is when a student has to take an exam again after not passing it the first time.",
    "kazi": "'Kazi' is a Swahili word for 'work' or 'job'. It's often used to ask what's up, as in 'Kazi gani?' - 'What's the work?'",
    "boda boda": "A 'boda boda' is a motorcycle taxi, a very common and popular form of transport in Uganda for getting around quickly.",
    "gg": "Short for 'Good Game'. Often used in online chats to show sportsmanship after a game or a deal is done.",
    "sold out": "When an item is marked 'Sold Out', it means the seller has already sold it and it is no longer available for purchase."
};

// ⭐ NEW: DELIVERY ESTIMATOR DATABASE ⭐
const delivery_zones = {
    "campus": { "kabeho": 2000, "nyabikoni": 2500, "mbarara road": 3000, "town": 2000, "rushoroza": 2000, "kigere": 3000 },
    "town": { "campus": 2000, "nyabikoni": 1500, "kabeho": 2000, "mbarara road": 2500, "rushoroza": 1500, "kigere": 2500 }
};

const answers = {
  // ⭐ NEW: UTILITY RESPONSES ⭐
  "calculation_error": { text: "I'm sorry, I couldn't understand that calculation. Please try a simple format like '15000 + 500' or '20% of 50000'.", suggestions: ["How to sell", "Help"] },
  "glossary_not_found": { text: "I don't have a definition for that term right now, but I'm always learning!", suggestions: ["What is a 'boda boda'?", "Help"] },
  "delivery_estimate_error": { text: "I can only estimate delivery costs between major zones like 'Campus' and 'Town'. Please ask in the format: 'delivery cost from campus to town'.", suggestions: ["Delivery from Campus to Town"] },
  "conversation_cancelled": { text: "Okay, I've cancelled that process. What would you like to do next?", suggestions: ["Help", "Find a laptop"] },

  // ⭐ NEW & REVISED: CONVERSATIONAL UPLOAD FLOW ⭐
  "upload_flow": {
      "start": { text: "Awesome! I can help with that. Let's create your listing step-by-step. First, what is the title of the item you are selling?", suggestions: ["Cancel"] },
      "get_title": { text: "Got it. Now, please write a short description for your item. Mention its condition and any special features.", suggestions: ["Cancel"] },
      "get_description": { text: "Perfect. What price are you asking for? Just type the number, for example: 50000", suggestions: ["Cancel"] },
      "get_price": { text: "Great price! Which category does this belong in?", suggestions: ["Electronics", "Clothing", "Furniture", "Books", "Kitchen", "Other"] },
      "get_category": { text: "Okay. What is the WhatsApp number buyers should use to contact you? Please start with '07...'", suggestions: ["Cancel"] },
      "get_whatsapp": { text: "Excellent. The final step is to upload at least one photo. Please click the button below to select an image from your device. I'll wait.", suggestions: ["Cancel"] },
      "get_photo": { text: "Photo received! I have all the information. I'm now creating your listing... this may take a moment." },
      "finish_success": { text: "Success! Your item is now live on the marketplace. You can view and manage it from your dashboard.", suggestions: ["Go to my dashboard", "Sell another item"] },
      "finish_error": { text: "I'm sorry, there was an error while trying to create your listing. Please try again using the <a href='/upload/'>Upload Page</a>, or contact support if the problem continues.", suggestions: ["Contact support"] }
  },
 
  // ⭐ NEW: PLATFORM ACTION RESPONSES ⭐
  "user_not_logged_in": { text: "You need to be logged in to do that. Please <a href='/login.html'>log in</a> or <a href='/register.html'>create an account</a> first.", suggestions: ["How to sell", "How to buy"] },
  "contact_seller_info": { text: "To contact the seller, please visit the product's page and use the contact details provided there. This ensures all communication is direct and secure." },
  "exit_intent": { text: "👋 Before you go, did you find what you were looking for? I'm here to help if you have any questions!", suggestions: ["How to sell", "Find a hostel"] },

  // --- CORE CONVERSATIONAL ---
  "greetings": [
    { text: "👋 Hello! I'm <b>Amara</b>, your guide to the KabaleOnline community marketplace. How can I help you today?", suggestions: ["How do I sell?", "Find a hostel", "Is selling free?"] },
    { text: "Hi there! Amara at your service. What can I help you find or list today?", suggestions: ["Show me electronics", "How to buy safely", "Contact admin"] },
    { text: "Welcome! I'm Amara. Ask me anything about buying, selling, or our community.", suggestions: ["Who is the founder?", "What is your mission?", "Find me a laptop"] }
  ],
  "well_being": {
    text: "I'm doing great, thanks for asking! As an AI, I'm always ready to help. What can I assist you with?",
    suggestions: ["How to sell", "How to buy safely", "Contact admin"]
  },
  "bot_identity": {
    text: `👋 Hi! I'm <b>Amara</b>, your personal 24/7 guide to KabaleOnline.
    <ul>
        <li>I can answer your questions on how to use the site.</li>
        <li>I can help you find specific categories of items.</li>
        <li>I can even help you create a product listing through conversation.</li>
    </ul>
    You can ask me questions like "How do I sell?", "Show me electronics", or "I want to sell my phone".`,
    suggestions: ["How do I sell?", "Show me electronics", "What is your mission?"]
  },
  "gratitude": [
    { text: "You're most welcome! Is there anything else I can help with?", suggestions: ["How to sell", "Find a hostel"] },
    { text: "No problem at all! What's next on the list?", suggestions: ["Show me electronics", "Contact support"] },
    { text: "You got it! Anything else I can assist with?", suggestions: ["How do I buy?", "Is selling free?"] },
    { text: "Happy to be of service!", suggestions: ["How to rent a room", "Show me clothing"] }
  ],
  "affirmation": { text: "Great! What can I help you with?", suggestions: ["How to sell", "How to buy", "Help"] },
  "negation": { text: "Okay, sounds good! I'll be right here if you need anything else.", suggestions: [] },
  "confirm_name_set": { text: "Got it! I'll remember to call you ${userName} from now on. How can I help you today?", suggestions: ["How to sell", "Find a hostel", "Is selling free?"] },

  // --- PROCESS-BASED "WHAT'S NEXT?" ---
  "after_upload": { text: "Great question! After your product is live, keep an eye on your <a href='/dashboard/'>Dashboard</a> for any new orders. You'll receive a notification when someone wants to buy it. Good luck!", suggestions: ["Go to my dashboard", "How to sell safely"] },
  "after_delivery": { text: "Congratulations on your sale! The final and most important step is to go to your <a href='/dashboard/'>Dashboard</a> and mark the item as 'Sold'. This keeps the marketplace tidy for everyone.", suggestions: ["Go to my dashboard", "Sell another item"] },

  // --- CHITCHAT & PERSONALITY ---
  "chitchat_joke": [
    { text: "Why don't scientists trust atoms? Because they make up everything!", suggestions: ["Tell me another joke", "Help"] },
    { text: "What do you call a fake noodle? An Impasta!", suggestions: ["Tell me another joke", "Help"] }
  ],
  "chitchat_time": [ { text: "Of course, the current time is:" }, { text: "No problem, the time is:" } ],
  "chitchat_weather": [ { text: "I don't have windows, but my forecast says it's a 100% chance of finding great deals on KabaleOnline! I hope your Monday in Kampala is going well. ☀️", suggestions: ["Find me a deal", "Help"] } ],

  // --- CORE FEATURES ---
  "rent": { text: `🏠 Looking for a place to stay in Kabale? You're in the right place. Start by browsing all listings in our <a href='/rentals/' target='_blank'>Hostels & Rentals</a> section and remember to always visit a place in person before making any payment.`, suggestions: ["How do I sell an item?", "Are there jobs available?", "Tell me about safety"] },
  "sell": { text: `🛍️ Absolutely! Selling on KabaleOnline is fast, free, and designed for our community. You can use the traditional <a href='/upload/' target='_blank'>Upload Item Page</a>, or just tell me "I want to sell an item" and I can guide you through it!`, suggestions: ["I want to sell an item", "Is selling free?", "Tips for good photos"] },
  "buy": { text: `💰 Of course! Start by exploring the <a href='/shop/' target='_blank'>Shop Page</a>. Use the search bar for specific items or click on a category. Always agree to meet in a safe, public place and inspect the item carefully before you pay.`, suggestions: ["How do I track my orders?", "Tell me about safety", "How do I sell my own items?"] },
  
  // --- SELLING DETAILS ---
  "cost_of_selling": { text: `✅ Yes, selling on KabaleOnline is <strong>100% FREE</strong> for everyone in the community! There are <b>no listing fees</b> and <b>no commissions</b> on your sales.`, suggestions: ["How do I sell an item?", "What items are prohibited?"] },
  "how_to_edit": { text: `✍️ It's easy to update your listing. Go to your <a href='/dashboard/' target='_blank'>Dashboard</a>, find the item you wish to edit, and click the 'Edit' button next to it.`, suggestions: ["How do I delete an item?", "Go to my Dashboard"] },
  "how_to_delete": { text: `🗑️ To permanently remove your listing, go to your <a href='/dashboard/' target='_blank'>Dashboard</a> and click the 'Delete' button. Please be sure, as this action cannot be undone.`, suggestions: ["How do I mark an item as sold?", "Go to my Dashboard"] },
  "mark_as_sold": { text: `🎉 Congratulations on your sale! To keep the marketplace up-to-date, please go to your <a href='/dashboard/' target='_blank'>Dashboard</a> and use the toggle or button to mark your item as "Sold Out".`, suggestions: ["How do I sell another item?", "Go to my Dashboard"] },
  "photo_tips": { text: `📸 Great photos can make your item sell 3x faster! Use natural light, show multiple angles, use a clean background, and be honest about any scratches or marks.`, suggestions: ["How do I sell an item?", "How do I edit my listing?"] },
  "pricing_advice": { text: `💰 Setting the right price is important. We recommend you search for similar items on the <a href="/shop/" target="_blank">shop page</a> to see what they are selling for. Consider the item's condition, age, and brand when deciding on a fair price.`, suggestions: ["Can I bargain?", "How to sell an item"] },

  // --- TRANSACTION & SAFETY ---
  "payment_methods": { text: `💸 All payments are handled directly between the buyer and the seller. We strongly recommend using <b>Mobile Money</b> or <b>Cash</b> upon meetup. For your safety, <b>never send money</b> before you have received and inspected the item.`, suggestions: ["How do I buy safely?", "Can I bargain?"] },
  "user_safety": { text: `🛡️ Your safety is our top priority. Always meet in well-lit, public places. Inspect items before paying. Trust your gut; if a deal feels too good to be true, walk away. And please report any suspicious users to the admin.`, suggestions: ["How do I buy an item?", "How do I sell an item?", "Contact the admin"] },

  // --- KABALE ONLINE INFO ---
  "about_platform": { text: `KabaleOnline is a free community marketplace built for the students and residents of Kabale. Our platform makes it easy and safe for you to buy and sell goods, find rentals, discover local services, and stay connected.`, suggestions: ["What is your mission?", "Who is the founder?", "Is selling free?"] },
  "objectives": { text: `🎯 Our main objectives are to provide a 100% free and accessible platform for students and residents to trade, create a hub for local opportunities, promote safety in transactions, and foster a strong sense of community.`, suggestions: ["What is your mission?", "Who is the founder?", "How do I sell?"] },
  "mission_vision": { text: `🎯 Our <b>Mission</b> is to empower the Kabale community by making local commerce and services simple, accessible, and safe. Our <b>Vision</b> is to be the digital heartbeat of Kabale, connecting every student and resident to the opportunities around them.`, suggestions: ["Who is the founder?", "How do I sell an item?", "I need to contact support"] },
  "founder": { text: `👨‍💻 KabaleOnline was founded and is run by <b>AMPEIRE SAMUEL</b>, a student at Kabale University. The platform was born from a direct need to solve the challenges students face, making it a project built by a student, for the students and the entire community.`, suggestions: ["What is the mission?", "When was it founded?", "How can I help?"] },
  "history_founded": { text: `📅 KabaleOnline was founded in <b>August 2025</b>. It started as a project to create a practical, real-world solution for the local community's needs and has been growing with user feedback ever since!`, suggestions: ["Who is the founder?", "What is the vision?", "Browse all items"] },
  "contact": { text: `📞 For any technical problems or to report a user, please contact the admin. The fastest way is via <b>WhatsApp</b> at <a href="httpsa://wa.me/256784655792" target="_blank">0784655792</a> or through our <a href='/contact.html' target='_blank'>Contact Form</a>.`, suggestions: ["How to sell safely", "How to buy safely"] },

  // --- HELP (Updated to be non-conflicting) ---
  "help": { text: `🆘 I can help with almost anything on KabaleOnline! Just ask me a question about any of these topics:
    <br><strong>🛒 Shopping & Selling</strong> (e.g., "How do I sell", "Safety Tips")
    <br><strong>👤 Your Account</strong> (e.g., "Dashboard", "Edit my item")
    <br><strong>🏢 About KabaleOnline</strong> (e.g., "What is your mission?")
    <br>If you have a serious problem, just ask to "contact the admin".`,
    suggestions: ["How do I sell safely?", "Tell me about the founder", "Find a hostel"]
  }
};
