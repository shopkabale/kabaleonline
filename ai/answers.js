// File: /ai/answers.js - FINAL EXPANDED VERSION

const answers = {
  // --- CORE CONVERSATIONAL ---
  "greetings": {
    text: "👋 Hello! I'm Amara, your guide to the KabaleOnline community marketplace. How can I help you today?",
    suggestions: ["How do I sell an item?", "Find a hostel", "Is selling free?"]
  },
  "well_being": {
    text: "I'm doing great, thanks for asking! As an AI, I'm always ready to help. What can I assist you with?",
    suggestions: ["How to sell", "How to buy safely", "Price of a laptop"]
  },
  "bot_identity": {
    text: `👋 Hello, I'm <b>Amara</b>! I'm your personal, 24/7 guide to buying, selling, and discovering everything in our community. I can answer questions, find products, and guide you on using the platform effectively.`,
    suggestions: ["How do I sell an item?", "Is selling free?"]
  },
  "gratitude": {
    text: "You're welcome! Is there anything else I can help you with?",
    suggestions: ["Show me electronics", "How do I contact support?"]
  },

  // --- CORE PLATFORM ACTIONS ---
  "sell": {
    text: `🛍️ Selling on KabaleOnline is fast and free! Here's a quick guide:
    <ol>
      <li>Go to the <a href='/upload/' target='_blank'>Upload Item Page</a>.</li>
      <li>Add clear photos, a specific title, and an honest description.</li>
      <li>Set a fair price.</li>
      <li>Once a buyer contacts you, arrange a safe public meetup, and get paid upon exchange.</li>
    </ol>
    <b>Pro Tip:</b> Good photos and a detailed description help your item sell much faster!`,
    suggestions: ["Is selling free?", "Tips for good photos", "How to buy safely"]
  },
  "buy": {
    text: `💰 Shopping is easy and safe if you follow these steps:
    <ol>
      <li>Explore the <a href='/shop/' target='_blank'>Shop Page</a> to find what you need.</li>
      <li>Contact the seller to ask questions and arrange a meetup.</li>
      <li><b>Always meet in a safe, public place</b> (like the university campus).</li>
      <li><b>Inspect the item thoroughly</b> before you pay. Never pay for an item you haven't seen.</li>
    </ol>`,
    suggestions: ["Are there delivery options?", "What payment methods can I use?", "Safety tips"]
  },
  "rent": {
    text: `🏠 Looking for a place to stay in Kabale? You're in the right place. Start by browsing all listings in our <a href='/rentals/' target='_blank'>Hostels & Rentals</a> section. Remember to visit a place in person before making any payment!`,
    suggestions: ["How do I sell?", "Are there jobs available?", "Find electronics"]
  },

  // --- TRANSACTION DETAILS ---
  "cost_of_selling": {
    text: `✅ Yes, selling on KabaleOnline is <strong>100% FREE</strong> for everyone in the community! There are no listing fees and no commissions on your sales.`,
    suggestions: ["How do I sell an item?", "What can't I sell?"]
  },
  "payment_methods": {
    text: `💸 All payments are handled directly between the buyer and the seller. We strongly recommend using:
    <ul>
      <li><b>Mobile Money</b> (MTN or Airtel) upon meetup.</li>
      <li><b>Cash</b> upon meetup.</li>
    </ul>
    For your safety, <b>never send money</b> before you have received and inspected the item.`,
    suggestions: ["How do I buy safely?", "Can I bargain?"]
  },
  "delivery_options": {
    text: `🚴‍♂️ Currently, all deliveries are arranged directly between the buyer and seller. We recommend agreeing on a safe, public place to meet for the exchange. A trusted Boda Boda can also be used for small items once payment is confirmed.`,
    suggestions: ["Safety tips", "What payment methods are used?"]
  },
  "bargaining": {
    text: `🤝 Yes, some sellers may be open to negotiation! You can contact the seller directly using the details on the product page to discuss the price. Always be respectful in your negotiations.`,
    suggestions: ["How to contact a seller?", "How to buy an item"]
  },

  // --- ACCOUNT & LISTING MANAGEMENT ---
  "account_management": {
    text: `⚙️ You can manage all aspects of your account in your <a href='/dashboard/' target='_blank'>Dashboard</a>. From there, you can edit your profile, view your listings, track orders, and change your password.`,
    suggestions: ["How to edit my listing?", "How to delete an item?", "I forgot my password"]
  },
  "how_to_edit": {
    text: `✍️ It's easy to update your listing. Go to your <a href='/dashboard/' target='_blank'>Dashboard</a>, find the item you wish to edit, and click the 'Edit' button. You can then change the price, description, or photos.`,
    suggestions: ["How do I delete an item?", "Go to my Dashboard"]
  },
  "how_to_delete": {
    text: `🗑️ To permanently remove a listing, go to your <a href='/dashboard/' target='_blank'>Dashboard</a>, find the item, and click the 'Delete' button. Please be sure, as this cannot be undone.`,
    suggestions: ["How do I mark as sold?", "Go to my Dashboard"]
  },
  "mark_as_sold": {
    text: `🎉 Congrats on the sale! In your <a href='/dashboard/' target='_blank'>Dashboard</a>, find the item and use the button to mark it as "Sold Out". This helps keep the marketplace clean for other users.`,
    suggestions: ["How do I sell another item?", "Go to my Dashboard"]
  },
  "photo_tips": {
    text: `📸 Great photos are the key to selling fast!
    <ul>
      <li>Use bright, natural light.</li>
      <li>Show the item from multiple angles.</li>
      <li>Use a clean, simple background.</li>
      <li>Be honest and show any scratches or defects.</li>
    </ul>`,
    suggestions: ["How do I sell an item?", "How should I price my item?"]
  },
  "pricing_advice": {
    text: `💰 Setting the right price is important. We recommend you search for similar items on the <a href="/shop/" target="_blank">shop page</a> to see what they are selling for. Consider the item's condition, age, and brand.`,
    suggestions: ["Can I bargain?", "How to sell an item"]
  },

  // --- TRUST, SAFETY & SUPPORT ---
  "user_safety": {
    text: `🛡️ Your safety is our number one priority. Please remember these golden rules:
    <ul>
      <li><b>Meet in public, stay in public.</b> The university campus is a great option.</li>
      <li><b>Inspect before you pay.</b> Never send money for something you haven't seen.</li>
      <li><b>Trust your instincts.</b> If a deal seems too good to be true, it probably is.</li>
    </ul>`,
    suggestions: ["How to report a user?", "Are there returns?"]
  },
  "disputes_returns": {
    text: `All transactions are directly between the buyer and seller, so all sales are considered final. This is why it is critical to <b>inspect items thoroughly before paying</b>. If you have a serious issue with a user (like fraud or a scam), please contact the admin immediately with all the details.`,
    suggestions: ["How do I contact support?", "Safety tips"]
  },
  "contact": {
    text: `📞 For technical problems, reporting a suspicious user, or other issues requiring direct help, please contact the admin via <b>WhatsApp at <a href="https://wa.me/256784655792" target="_blank">0784655792</a></b> or use the <a href='/contact.html' target='_blank'>Contact Form</a>.`,
    suggestions: ["How to buy safely", "I have a technical problem"]
  },
  "technical_support": {
    text: `I'm sorry you're facing a technical issue. For problems like login errors, password resets, or upload failures, please try refreshing the page first. If the problem continues, please <a href="https://wa.me/256784655792" target="_blank">contact support</a> with a screenshot of the error.`,
    suggestions: ["Contact support", "How to use the dashboard"]
  },
  "prohibited_items": {
    text: `🚫 To keep our community safe, certain items are not allowed, including illegal items, weapons, stolen goods, and counterfeit products. Please only list items that you legally own.`,
    suggestions: ["How to sell safely", "Contact admin"]
  },

  // --- COMMUNITY & PLATFORM INFO ---
  "about_platform": {
    text: `KabaleOnline is a free community marketplace built for the students and residents of Kabale. Our platform makes it easy and safe for you to buy and sell goods, find rentals, discover local services, and stay connected with what's happening in town.`,
    suggestions: ["What is your mission?", "Who is the founder?", "Is selling free?"]
  },
  "mission_vision": {
    text: `🎯 Our mission is to <b>empower the Kabale community</b> by making local commerce and services simple, accessible, and safe. Our vision is to be the digital heartbeat of Kabale, connecting every student and resident to the opportunities around them.`,
    suggestions: ["Who is the founder?", "How do I sell an item?"]
  },
  "founder": {
    text: `👨‍💻 KabaleOnline was founded and is run by <b>AMPEIRE SAMUEL</b>, a student at Kabale University. It's a project built by a student, for the students and the entire community.`,
    suggestions: ["What is the mission?", "When was it founded?"]
  },
  "history_founded": {
    text: `📅 KabaleOnline was founded in <b>August 2025</b> as a project to create a practical, real-world solution for the local community's needs.`,
    suggestions: ["Who is the founder?", "What is the vision?"]
  },
  "events": {
    text: `🎟️ Find out what's happening in Kabale! Check the <a href='/events/' target='_blank'>Events Page</a> for local concerts, promotions, and community gatherings.`,
    suggestions: ["Read the campus blog", "How do I find a job?"]
  },
  "blog": {
    text: `📚 Check out our <a href='/blog/' target='_blank'>Blog</a> for updates, campus stories, safety tips for online shopping, and news about what's happening in Kabale.`,
    suggestions: ["Tell me about events", "Who is the founder?"]
  },

  // --- GENERAL HELP ---
  "help": {
    text: `🆘 I can help with most things on KabaleOnline! Just ask me a question like "How to sell an item," "Is it free to sell?," or "Show me laptops."`,
    suggestions: ["How do I sell?", "How do I buy?", "Contact support"]
  }
};