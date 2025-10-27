// File: /ai/answers.js (Definitive, Expanded Version)

const answers = {

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
        <li>I can even look up live product information for you.</li>
    </ul>
    You can ask me questions like "How do I sell?", "Show me electronics", or "Price of a laptop".`,
    suggestions: ["How do I sell?", "Show me electronics", "What is your mission?"]
  },
  "gratitude": [
    { text: "You're most welcome! Is there anything else I can help with?", suggestions: ["How to sell", "Find a hostel"] },
    { text: "No problem at all! What's next on the list?", suggestions: ["Show me electronics", "Contact support"] },
    { text: "You got it! Anything else I can assist with?", suggestions: ["How do I buy?", "Is selling free?"] },
    { text: "My pleasure. I'm here 24/7 if you need me!", suggestions: ["Tell me about safety", "Who is the founder?"] },
    { text: "Anytime! That's what I'm here for.", suggestions: ["Find me a laptop", "What is your mission?"] },
    { text: "Glad I could help out!", suggestions: ["How do I edit my item?", "Are there jobs?"] },
    { text: "Of course! Don't hesitate to ask if anything else comes up.", suggestions: ["How to sell safely", "Read the blog"] },
    { text: "Happy to be of service!", suggestions: ["How to rent a room", "Show me clothing"] },
    { text: "It was nothing! Seriously, I'm an AI, I don't get tired.", suggestions: ["Find me a phone", "I want to sell"] },
    { text: "You're welcome. Your success is my success!", suggestions: ["Go to my dashboard", "Help"] }
  ],

  // --- NEW: YES/NO HANDLING ---
  "affirmation": {
    text: "Great! What can I help you with?",
    suggestions: ["How to sell", "How to buy", "Help"]
  },
  "negation": {
    text: "Okay, sounds good! I'll be right here if you need anything else.",
    suggestions: []
  },

  // --- NEW: USER PERSONALIZATION ---
  "prompt_for_name": {
    text: "Of course! What should I call you?",
    suggestions: []
  },
  "confirm_name_set": {
    text: "Got it! I'll remember to call you ${userName} from now on. How can I help you today?",
    suggestions: ["How to sell", "Find a hostel", "Is selling free?"]
  },
  
  // --- NEW: PROCESS-BASED "WHAT'S NEXT?" ---
  "after_upload": {
    text: "Great question! After your product is live, keep an eye on your <a href='/dashboard/'>Dashboard</a> for any new orders. You'll receive a notification when someone wants to buy it. Good luck!",
    suggestions: ["Go to my dashboard", "How to sell safely"]
  },
  "after_delivery": {
    text: "Congratulations on your sale! The final and most important step is to go to your <a href='/dashboard/'>Dashboard</a> and mark the item as 'Sold'. This keeps the marketplace tidy for everyone.",
    suggestions: ["Go to my dashboard", "Sell another item"]
  },

  // --- NEW: CHITCHAT & PERSONALITY ---
  "chitchat_joke": [
    { text: "Why don't scientists trust atoms? Because they make up everything!", suggestions: ["Tell me another joke", "Help"] },
    { text: "What do you call a fake noodle? An Impasta!", suggestions: ["Tell me another joke", "Help"] },
    { text: "I told my computer I needed a break, and now it won’t stop sending me Kit-Kat ads.", suggestions: ["Tell me another joke", "Help"] }
  ],
  "chitchat_weather": [
    // This response is time & location aware, as you're in Kampala on a Monday.
    { text: "I don't have windows, but my forecast says it's a 100% chance of finding great deals on KabaleOnline! I hope your Monday in Kampala is off to a great start. ☀️", suggestions: ["Find me a deal", "Help"] }
  ],

  // --- CORE FEATURES (from your original file) ---
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

  // --- SELLING DETAILS (from your original file) ---
  "cost_of_selling": {
    text: `✅ Yes, selling on KabaleOnline is <strong>100% FREE</strong> for everyone in the community!
    <ul>
      <li>There are <b>no listing fees</b>.</li>
      <li>There are <b>no commissions</b> on your sales.</li>
    </ul>
    Our goal is to empower students and residents. The full amount you sell your item for is the amount you keep.`,
    suggestions: ["How do I sell an item?", "What items are prohibited?", "How to take good photos"]
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
    text: `🗑️ If you want to permanently remove your listing:
    <ol>
      <li>Go to your <a href='/dashboard/' target='_blank'>Dashboard</a>.</li>
      <li>Find the listing you want to remove.</li>
      <li>Click the 'Delete' button. Please be sure, as this action cannot be undone.</li>
    </ol>`,
    suggestions: ["How do I mark an item as sold?", "Go to my Dashboard", "Help me sell"]
  },
  "mark_as_sold": {
    text: `🎉 Congratulations on your sale! To keep the marketplace up-to-date, please mark your item as sold.
    <ul>
      <li>Go to your <a href='/dashboard/' target='_blank'>Dashboard</a>.</li>
      <li>Find the item and use the toggle or button to mark it as "Sold Out".</li>
      <li>This hides it from the shop so you won't get any more inquiries.</li>
    </ul>`,
    suggestions: ["How do I sell another item?", "Go to my Dashboard", "Leave feedback"]
  },
  "photo_tips": {
    text: `📸 Great photos can make your item sell 3x faster! Here are some pro tips:
    <ul>
      <li><b>Use Natural Light:</b> Take photos near a window during the day. Avoid harsh shadows.</li>
      <li><b>Show Multiple Angles:</b> Take pictures of the front, back, and sides. For electronics, show the ports.</li>
      <li><b>Clean Background:</b> Place your item on a plain background like a clean floor or a wall.</li>
      <li><b>Be Honest:</b> If there's a small scratch, take a clear photo of it. Buyers appreciate honesty!</li>
    </ul>`,
    suggestions: ["How do I sell an item?", "How do I edit my listing?", "Is selling free?"]
  },
  "pricing_advice": {
    text: `💰 Setting the right price is important. We recommend you search for similar items on the <a href="/shop/" target="_blank">shop page</a> to see what they are selling for. Consider the item's condition, age, and brand when deciding on a fair price.`,
    suggestions: ["Can I bargain?", "How to sell an item"]
  },

  // --- TRANSACTION & SAFETY (from your original file) ---
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
  "prohibited_items": {
    text: `🚫 To keep our community safe, certain items are not allowed. This includes, but is not limited to:
    <ul>
      <li>Illegal items or substances.</li>
      <li>Weapons and hazardous materials.</li>
      <li>Stolen goods.</li>
      <li>Counterfeit or fake products.</li>
    </ul>
    Please only list items you legally own.`,
    suggestions: ["How to sell safely", "Contact admin", "How do I sell an item?"]
  },
  "disputes_returns": {
    text: `All transactions are directly between the buyer and seller, so all sales are considered final. This is why it is critical to <b>inspect items thoroughly before paying</b>. If you have a serious issue with a user (like fraud or a scam), please contact the admin immediately with all the details.`,
    suggestions: ["How do I contact support?", "Safety tips"]
  },
  "user_safety": {
    text: `🛡️ Your safety is our top priority. Here are key tips for transacting on KabaleOnline:
    <ul>
      <li><b>Meet in Public:</b> Always meet sellers/buyers in well-lit, public places. The university campus is a great option.</li>
      <li><b>Inspect Before Paying:</b> Never send money before you have inspected the item in person and are happy with it.</li>
      <li><b>Trust Your Gut:</b> If a deal feels too good to be true or a user seems suspicious, walk away.</li>
      <li><b>Report Issues:</b> If you have a problem with a user, please <a href="https://wa.me/256784655792" target="_blank">contact the admin</a> immediately.</li>
    </ul>`,
    suggestions: ["How do I buy an item?", "How do I sell an item?", "Contact the admin"]
  },

  // --- TROUBLESHOOTING (from your original file) ---
  "technical_support": {
    text: `I'm sorry you're facing a technical issue. For problems like login errors, password resets, or upload failures, please try refreshing the page first. If the problem continues, please <a href="https://wa.me/256784655792" target="_blank">contact support</a> with a screenshot of the error.`,
    suggestions: ["Contact support", "How to use the dashboard"]
  },
  "seller_unresponsive": {
    text: `We're sorry to hear that. Most sellers reply within a day.
    <ul>
      <li>First, please double-check that you used the correct contact number.</li>
      <li>If you've waited more than 48 hours, they may no longer have the item. We recommend you cancel the order and look for another one.</li>
      <li>If a seller is consistently unresponsive or suspicious, please <a href="https://wa.me/256784655792" target="_blank">contact the admin</a> with their details.</li>
    </ul>`,
    suggestions: ["How do I find my orders?", "How do I buy safely?", "Browse all items"]
  },
  "login_issues": {
    text: `🔑 Having trouble signing in?
    <ul>
      <li>If you've forgotten your password, use the <a href='/forgot-password.html' target='_blank'>'Forgot Password'</a> link on the login page to reset it.</li>
      <li>Make sure you are using the correct email or username you signed up with.</li>
      <li>If you still can't get in, please <a href="httpsa://wa.me/256784655792" target="_blank">contact admin</a> for assistance.</li>
    </ul>`,
    suggestions: ["Go to my dashboard", "Help me sell an item", "Contact admin"]
  },
  "upload_issues": {
    text: `🖼️ Sorry you're having trouble with photos. Here are some common fixes:
    <ul>
      <li><b>Check File Size:</b> Images that are too large might fail. Try using a smaller photo (under 2MB is best).</li>
      <li><b>Check File Type:</b> We accept standard formats like JPG, PNG, and WEBP.</li>
      <li><b>Check Your Connection:</b> A weak internet connection can interrupt the upload.</li>
    </ul>
    If it still doesn't work, let the admin know!`,
    suggestions: ["How to take good photos", "Contact admin", "How do I edit my listing?"]
  },

  // --- PLATFORM FEATURES (from your original file) ---
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
    text: `📚 Check out our <a href='/blog/' target='_blank'>Blog</a> for updates, stories from campus, safety tips for online shopping, and news about what's happening in Kabale.`,
    suggestions: ["Tell me about events", "Who is the founder?", "I need general help"]
  },

  // --- KABALE ONLINE INFO (from your original file) ---
  "about_platform": {
    text: `KabaleOnline is a free community marketplace built for the students and residents of Kabale. Our platform makes it easy and safe for you to buy and sell goods, find rentals, discover local services, and stay connected with what's happening in town.`,
    suggestions: ["What is your mission?", "Who is the founder?", "Is selling free?"]
  },
  
  // --- EXPANDED: MISSION & OBJECTIVES ---
  "mission_vision": {
    text: `🎯 Our <b>Mission</b> is to empower the Kabale community by making local commerce and services simple, accessible, and safe.
    <br><br>
    Our <b>Vision</b> is to be the digital heartbeat of Kabale, connecting every student and resident to the opportunities around them.
    <br><br>
    Our <b>Objectives</b> are to:
    <ul>
      <li>Provide a 100% free platform for students to trade.</li>
      <li>Create a centralized hub for local services and job opportunities.</li>
      <li>Promote safety and trust in peer-to-peer transactions.</li>
      <li>Foster a strong sense of community by connecting people's needs with local solutions.</li>
    </ul>`,
    suggestions: ["Who is the founder?", "How do I sell an item?", "I need to contact support"]
  },
  "founder": {
    text: `👨‍💻 KabaleOnline was founded and is run by <b>AMPEIRE SAMUEL</b>, a student at Kabale University. The platform was born from a direct need to solve the challenges students face, making it a project built by a student, for the students and the entire community.`,
    suggestions: ["What is the mission?", "When was it founded?", "How can I help?"]
  },
  "history_founded": {
    text: `📅 KabaleOnline was founded in <b>August 2025</b>. It started as a project to create a practical, real-world solution for the local community's needs and has been growing with user feedback ever since!`,
    suggestions: ["Who is the founder?", "What is the vision?", "Browse all items"]
  },
  "contact": {
    text: `📞 For any technical problems, reporting a user, or complex issues that require direct help, please contact the admin. This is for when something is broken or you have a serious complaint.
    <ul>
      <li><b>WhatsApp (Fastest Response):</b> <a href="httpsa://wa.me/256784655792" target="_blank">0784655792</a></li>
      <li><b>Email/Form:</b> Send a detailed message via our <a href='/contact.html' target='_blank'>Contact Form</a>.</li>
    </ul>`,
    suggestions: ["How to sell safely", "How to buy safely"]
  },

  // --- CATEGORIES (from your original file) ---
  "category_electronics": {
    text: `Great! Here are all the electronics listings. You can find phones, laptops, and more.
    <ul>
      <li><a href="/shop/?category=Electronics" target='_blank'>Browse all Electronics</a></li>
    </ul>`,
    suggestions: ["Show me clothing", "How do I sell my phone?"]
  },
  "category_clothing": {
    text: `Of course! Check out the latest in fashion from sellers in Kabale.
    <ul>
      <li><a href="/shop/?category=Clothing+%26+Apparel" target='_blank'>Browse all Clothing & Apparel</a></li>
    </ul>`,
    suggestions: ["Do you have furniture?", "How to sell an item"]
  },
  "category_furniture": {
    text: `Yes, we do. You can find items to furnish your room or hostel right here.
    <ul>
      <li><a href="/shop/?category=Home+%26+Furniture" target='_blank'>Browse all Home & Furniture</a></li>
    </ul>`,
    suggestions: ["Show me electronics", "I need help"]
  },

  // --- OTHER (from your original file) ---
  "deliveries": {
    text: `🚴‍♂️ We're excited to announce that **KabaleOnline Deliveries** is coming soon! This feature will allow you to request a verified and trusted boda rider for same-day pickups and drop-offs around town. Stay tuned!`,
    suggestions: ["What services are available now?", "Are there any events?", "How to sell an item"]
  },
  "events": {
    text: `🎟️ Find out what's happening in Kabale or promote your own event!
    <ul>
      <li>Check the <a href='/events/' target='_blank'>Events Page</a> for local concerts, promotions, and community gatherings.</li>
      <li>As a promoter, you can post your event for free to reach a huge local audience.</li>
    </ul>`,
    suggestions: ["Read the campus blog", "How do I find a job?", "I need help"]
  },
  
  // --- HELP (Updated to be non-conflicting) ---
  "help": {
    text: `🆘 I can help with almost anything on KabaleOnline! Here’s a full guide to what I know. Just ask me a question about any of these topics:
    <br><strong>🛒 Shopping & Selling</strong>
    <ul>
      <li><b>"How do I sell":</b> I'll guide you on creating listings.</li>
      <li><b>"How do I buy":</b> I'll guide you on making purchases.</li>
      <li><b>"Is selling free?":</b> I can explain our fee policy (spoiler: it's free!).</li>
      <li><b>"Safety Tips":</b> Ask me for advice on how to transact safely.</li>
    </ul>
    <strong>👤 Your Account</strong>
    <ul>
      <li><b>"Dashboard":</b> Learn how to manage your account and listings.</li>
      <li><b>"My Orders":</b> I can show you where to track your purchases.</li>
      <li><b>"Edit my item":</b> I can explain how to manage your posts.</li>
    </ul>
    <strong>🏢 About KabaleOnline</strong>
    <ul>
      <li><b>"What is your mission?":</b> Learn about our purpose and goals.</li>
      <li><b>"Who is the founder?":</b> Find out more about who created the platform.</li>
    </ul>
    <p>If you have a serious problem or need to report a user, just ask to "contact the admin".</p>`,
    suggestions: ["How do I sell safely?", "Tell me about the founder", "Find a hostel"]
  }
};