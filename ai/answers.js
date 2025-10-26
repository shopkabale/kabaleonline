// File: /ai/answers.js - FINAL EXPANDED VERSION (Built from your original)

const answers = {
  // --- CORE CONVERSATIONAL ---
  "greetings": {
    text: "👋 Hello! I'm <b>Amara</b>, your guide to the KabaleOnline community marketplace. How can I help you today?",
    suggestions: ["How do I sell an item?", "Find a hostel", "Is selling free?"]
  },
  "well_being": {
    text: "I'm doing great, thanks for asking! As an AI, I'm always ready to help. What can I assist you with?",
    suggestions: ["How to sell", "How to buy safely", "Contact admin"]
  },
  "bot_identity": {
    text: `👋 Hi, I'm <b>Amara</b>! Your personal, 24/7 guide to buying, selling, and discovering everything in our community.
    <ul>
        <li>I can answer your questions on how to use the site.</li>
        <li>I can help you find specific categories of items.</li>
        <li>I can even look up live product information for you.</li>
    </ul>
    You can ask me questions like "How to sell?", "Show me electronics", or "Price of a laptop".`,
    suggestions: ["How do I sell an item?", "Show me electronics", "What is your mission?"]
  },
  "gratitude": {
    text: "You're most welcome! I'm here to help. Is there anything else you need assistance with?",
    suggestions: ["Show me electronics", "How do I contact support?"]
  },

  // --- CORE PLATFORM FEATURES (Your original detailed answers) ---
  "rent": {
    text: `🏠 Looking for a place to stay in Kabale? You're in the right place. Here's how to find your next home:
    <ul>
      <li>Start by browsing all listings in our <a href='/rentals/' target='_blank'>Hostels & Rentals</a> section.</li>
      <li>Use the filters to narrow your search by type: Single Rooms, Full Houses, Hostels, or even Shop Spaces.</li>
      <li><b>Pro Tip:</b> Always visit a place in person before making any payment. Your safety is our top priority.</li>
    </ul>`,
    suggestions: ["How do I sell an item?", "Are there jobs available?", "Tell me about safety"]
  },
  "sell": {
    text: `🛍️ Absolutely! Selling on KabaleOnline is fast, free, and designed for our community. Here is your complete step-by-step guide to turning your items into cash:
    <ol>
      <li>
        <strong>Create a Listing (in under 60 seconds):</strong> Go to the <a href='/upload/' target='_blank'>Upload Item Page</a>.
        <ul>
            <li>📸 <b>Add Great Photos:</b> Upload multiple, clear photos from different angles. Good lighting makes a huge difference!</li>
            <li>✍️ <b>Write a Smart Title:</b> Be specific. "Slightly Used iPhone X 256GB" is much better than "iPhone for sale".</li>
            <li>📋 <b>Be Honest:</b> In the description, mention the item's condition and any special features. Honesty builds trust!</li>
        </ul>
      </li>
      <li>
        <strong>Get Notified:</strong> As soon as a buyer places an order, you'll receive a notification. View all the details in your <a href='/dashboard/' target='_blank'>Seller Dashboard</a>.
      </li>
      <li>
        <strong>Contact the Buyer:</strong> Use the buyer's contact information to agree on a safe, public meeting place and a convenient time.
      </li>
      <li>
        <strong>Get Paid & Deliver:</strong> Meet the buyer, let them inspect the item, and get paid. We strongly recommend using **cash or mobile money** upon exchange. Mark the order as "Delivered" in your dashboard to complete the sale!</li>
    </ol>`,
    suggestions: ["Is selling free?", "How do I edit my listing?", "Tips for good photos"]
  },
  "buy": {
    text: `💰 Of course! Here’s how to find great deals and shop smart on KabaleOnline:
    <ol>
      <li>
        <strong>Browse & Discover:</strong> Start by exploring the <a href='/shop/' target='_blank'>Shop Page</a>. Use the search bar for specific items or click on a category.
      </li>
      <li>
        <strong>Save Your Finds:</strong> Add items to your <a href='/cart.html' target='_blank'>Shopping Cart</a> to buy, or to your <a href='/wishlist.html' target='_blank'>Wishlist</a> to save for later.
      </li>
      <li>
        <strong>Confirm Your Order:</strong> Checkout from your cart to notify the seller and get their contact details.
      </li>
      <li>
        <strong>Arrange Delivery (Safety First!):</strong> The seller will contact you. Always agree to meet in a **safe, public place** and **inspect the item carefully** before you pay.
      </li>
    </ol>`,
    suggestions: ["How do I track my orders?", "Tell me about safety", "How do I sell my own items?"]
  },
  "lost": {
    text: `📄 We can help reconnect lost and found items in the community. It's a vital service.
    <ul>
      <li>If you've lost something, please check the <a href='/lost-and-found/' target='_blank'>Lost & Found</a> section first.</li>
      <li>If you've found an item, please post it there! Include a photo and details about where you found it.</li>
      <li>This is crucial for items like National IDs, school documents, keys, and phones.</li>
    </ul>`,
    suggestions: ["How do I post an item?", "Read the campus blog", "Are there any events?"]
  },
  "jobs": {
    text: `💼 Whether you're hiring or looking for work, our platform connects local talent with opportunities.
    <ul>
      <li><b>For Job Seekers:</b> Visit our <a href='/services/' target='_blank'>Employment Section</a> to find the latest jobs and internships in Kabale.</li>
      <li><b>For Employers:</b> You can post your job openings for free to reach hundreds of skilled students and residents.</li>
    </ul>`,
    suggestions: ["What kind of services can I find?", "Tell me about the founder", "I need general help"]
  },
  "services": {
    text: `🧰 Need a professional? Our Services Hub connects you with skilled local experts for any task.
    <ul>
      <li>Visit the <a href='https://services.kabaleonline.com' target='_blank'>Services Hub</a> to browse providers.</li>
      <li>You can find Plumbers, Electricians, Tutors, Photographers, DJs, Mechanics, Boda Riders, and more.</li>
    </ul>`,
    suggestions: ["How do deliveries work?", "How can I post my service?", "I need to report an issue"]
  },

  // --- TRANSACTION DETAILS (NEW & EXPANDED) ---
  "cost_of_selling": {
    text: `✅ Yes, selling on KabaleOnline is <strong>100% FREE</strong> for everyone in the community!
    <ul>
      <li>There are <b>no listing fees</b>.</li>
      <li>There are <b>no commissions</b> on your sales.</li>
    </ul>
    Our goal is to empower students and residents. The full amount you sell your item for is the amount you keep.`,
    suggestions: ["How do I sell an item?", "What items are prohibited?", "How to take good photos"]
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

  // --- ACCOUNT & LISTING MANAGEMENT (Your original + new additions) ---
  "account_management": {
    text: `⚙️ You can manage all aspects of your account in your <a href='/dashboard/' target='_blank'>Dashboard</a>. From there, you can edit your profile, view your listings, track orders, and change your password.`,
    suggestions: ["How to edit my listing?", "How to delete an item?", "I forgot my password"]
  },
  "how_to_edit": {
    text: `✍️ It's easy to update your listing.
    <ol>
      <li>Go to your <a href='/dashboard/' target='_blank'>Dashboard</a>.</li>
      <li>Find the item you wish to edit and click the 'Edit' button next to it.</li>
      <li>You can change the title, description, price, and upload new photos.</li>
      <li>Click 'Save Changes' when you're done!</li>
    </ol>`,
    suggestions: ["How do I delete an item?", "Go to my Dashboard", "Tips for good photos"]
  },
  "how_to_delete": {
    text: `🗑️ To permanently remove a listing:
    <ol>
      <li>Go to your <a href='/dashboard/' target='_blank'>Dashboard</a>.</li>
      <li>Find the listing you want to remove.</li>
      <li>Click the 'Delete' button. Please be sure, as this action cannot be undone.</li>
    </ol>`,
    suggestions: ["How do I mark as sold?", "Go to my Dashboard", "Help me sell"]
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

  // --- TRUST, SAFETY & SUPPORT (Your original detailed answers) ---
  "user_safety": {
    text: `🛡️ Your safety is our top priority. Please remember these golden rules:
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

  // --- PLATFORM FEATURES (Your original detailed answers) ---
  "dashboard": {
    text: `⚙️ Your <a href='/dashboard/' target='_blank'>Dashboard</a> is your personal control center. From there, you can manage your listings, track orders, update your profile, and check your <a href='/inbox.html' target='_blank'>Inbox</a>.`,
    suggestions: ["How do I track my orders?", "What is the Wishlist?", "I want to sell something"]
  },
  "orders": {
    text: `📦 You can keep track of all your purchases in the <a href='/my-orders.html' target='_blank'>My Orders</a> section. It helps you see the status of each delivery and review your purchase history.`,
    suggestions: ["How do I buy an item?", "Go to my Dashboard", "I have a problem with an order"]
  },
  "wishlist": {
    text: `❤️ The <a href='/wishlist.html' target='_blank'>Wishlist</a> is a great way to save items you're interested in but aren't ready to buy yet. It helps you keep an eye on them for later!`,
    suggestions: ["How does the Shopping Cart work?", "Show me how to buy", "Explore all items"]
  },
  "cart": {
    text: `🛒 Your <a href='/cart.html' target='_blank'>Shopping Cart</a> holds all the items you've decided to purchase. From the cart, you can proceed to checkout to finalize arrangements with the seller.`,
    suggestions: ["How do I track my orders?", "What is the Wishlist?", "Continue shopping"]
  },
  "inbox": {
    text: `📥 Your <a href='/inbox.html' target='_blank'>Inbox</a> is where you can find all your private messages from sellers, buyers, or the site admin. It's important to check it regularly.`,
    suggestions: ["How do I contact the admin?", "Go to my Dashboard", "Help me sell an item"]
  },
  "requests": {
    text: `🙏 Can't find what you're looking for? Post a public request in the <a href='/requests/view.html' target='_blank'>User Requests</a> section! Sellers might see your request and have exactly what you need.`,
    suggestions: ["How do I search for items?", "Tell me about services", "Read the blog"]
  },
  "feedback": {
    text: `⭐ Your feedback helps our community grow stronger! You can <a href='/submit-testimonial.html' target='_blank'>Share Feedback</a> to leave a testimonial or report any issues. We read every submission!`,
    suggestions: ["Contact the admin directly", "What is KabaleOnline about?", "How to rent a hostel"]
  },
  "blog": {
    text: `📚 Check out our <a href='/blog/' target='_blank'>Blog</a> for updates, campus stories, safety tips for online shopping, and news about what's happening in Kabale.`,
    suggestions: ["Tell me about events", "Who is the founder?", "I need general help"]
  },

  // --- KABALE ONLINE INFO (Your original detailed answers) ---
  "about_platform": {
    text: `KabaleOnline is a free community marketplace built for the students and residents of Kabale. Our platform makes it easy and safe for you to buy and sell goods, find rentals, discover local services, and stay connected with what's happening in town.`,
    suggestions: ["What is your mission?", "Who is the founder?", "Is selling free?"]
  },
  "mission_vision": {
    text: `🎯 Our mission is to <b>empower the Kabale community</b> by making local commerce and services simple, accessible, and safe. Our vision is to be the digital heartbeat of Kabale, connecting every student and resident to the opportunities around them.`,
    suggestions: ["Who is the founder?", "How do I sell an item?", "I need to contact support"]
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

  // --- GENERAL HELP (Your original detailed answer) ---
  "help": {
    text: `🆘 I can help with almost anything on KabaleOnline! Here’s a full guide to what I know. Just ask me a question about any of these topics:
    <br><strong>🛒 Shopping & Selling</strong>
    <ul>
      <li><b>"How to Buy / Sell":</b> I'll guide you on creating listings and making purchases.</li>
      <li><b>"Is selling free?":</b> I can explain our fee policy (spoiler: it's free!).</li>
      <li><b>"Safety Tips":</b> Ask me for advice on how to transact safely.</li>
      <li><b>"Show me electronics":</b> I can find items for you in any category.</li>
    </ul>
    <strong>👤 Your Account</strong>
    <ul>
      <li><b>"Dashboard":</b> Learn how to manage your account and listings.</li>
      <li><b>"My Orders":</b> I can show you where to track your purchases.</li>
      <li><b>"Edit / Delete item":</b> I can explain how to manage your posts.</li>
    </ul>
    <strong>🏢 About KabaleOnline</strong>
    <ul>
      <li><b>"What is your mission?":</b> Learn about our purpose and goals.</li>
      <li><b>"Who is the founder?":</b> Find out more about who created the platform.</li>
    </ul>
    <p>If you have a serious problem, just ask to "contact support".</p>`,
    suggestions: ["How do I sell safely?", "Tell me about the founder", "Find a hostel"]
  }
};