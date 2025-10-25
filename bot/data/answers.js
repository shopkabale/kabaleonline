const answers = {
  // --- CORE FEATURES ---

  "greetings": {
    text: "👋 Hello! I'm the KabaleOnline Assistant, your expert guide to buying, selling, and discovering everything in our community. How can I help you today?",
    suggestions: ["How do I sell an item?", "Find a hostel", "What is KabaleOnline?"]
  },

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
            <li>📋 <b>Be Honest:</b> In the description, mention the item's condition, any special features, and be upfront about any scratches or defects. Honesty builds trust!</li>
        </ul>
      </li>
      <li>
        <strong>Get Notified:</strong> As soon as a buyer places an order, you'll receive a notification. You can view all the details in your <a href='/dashboard/' target='_blank'>Seller Dashboard</a>.
      </li>
      <li>
        <strong>Contact the Buyer:</strong> Use the buyer's contact information to call or message them. Agree on a safe, public meeting place like the university campus, and a convenient time for both of you.
      </li>
      <li>
        <strong>Get Paid & Deliver:</strong> Meet the buyer, let them inspect the item, and get paid. We strongly recommend using **cash or mobile money** upon exchange. Never send your item before you receive payment. Finally, mark the order as "Delivered" in your dashboard to complete the sale!</li>
    </ol>`,
    suggestions: ["How do I buy safely?", "How do I manage my listings?", "Contact the admin"]
  },

  "buy": {
    text: `💰 Of course! Here’s how to find great deals and shop smart on KabaleOnline:
    <ol>
      <li>
        <strong>Browse & Discover:</strong> Start by exploring the <a href='/shop/' target='_blank'>Shop Page</a>. Use the search bar for specific items (like "Airtel MiFi") or click on a category to see what's available.
      </li>
      <li>
        <strong>Save Your Finds:</strong> Found something you like?
        <ul>
            <li>🛒 If you're ready to buy, add it to your <a href='/cart.html' target='_blank'>Shopping Cart</a>.</li>
            <li>❤️ If you want to save it for later, add it to your <a href='/wishlist.html' target='_blank'>Wishlist</a>.</li>
        </ul>
      </li>
      <li>
        <strong>Confirm Your Order:</strong> When you're ready, proceed to checkout from your cart. This will notify the seller that you are interested and provide them with your contact details.
      </li>
      <li>
        <strong>Arrange Delivery (Safety First!):</strong> The seller will contact you to arrange payment and a meetup.
        <ul>
            <li>🤝 Always agree to meet in a **safe, public place**.</li>
            <li>🧐 **Inspect the item carefully** before you pay.</li>
            <li>💸 **Never send money** before you have seen the item and are happy with it.</li>
        </ul>
      </li>
    </ol>`,
    suggestions: ["How do I track my orders?", "Tell me about safety", "How do I sell my own items?"]
  },

  "lost": {
    text: `📄 We can help reconnect lost and found items in the community. It's a vital service for everyone.
    <ul>
      <li>If you've lost something, please check the <a href='/lost-and-found/' target='_blank'>Lost & Found</a> section first.</li>
      <li>If you've found an item, please post it! Include a photo and details about where you found it. You could make someone's day.</li>
      <li>This is especially important for critical items like National IDs, school documents, keys, and phones.</li>
    </ul>`,
    suggestions: ["How do I post an item?", "Read the campus blog", "Are there any events?"]
  },

  "jobs": {
    text: `💼 Whether you're hiring or looking for work, our platform connects local talent with opportunities.
    <ul>
      <li><b>For Job Seekers:</b> Visit our <a href='/services/' target='_blank'>Employment Section</a> to find the latest part-time jobs, full-time positions, and internships in Kabale.</li>
      <li><b>For Employers:</b> You can post your job openings for free to reach hundreds of skilled students and residents.</li>
    </ul>`,
    suggestions: ["What kind of services can I find?", "Tell me about the founder", "I need general help"]
  },

  "services": {
    text: `🧰 Need a professional? Our Services Hub connects you with skilled local experts for any task.
    <ul>
      <li>Visit the <a href='https://services.kabaleonline.com' target='_blank'>Services Hub</a> to browse providers.</li>
      <li>You can find Plumbers, Electricians, Tutors, Photographers, DJs, Mechanics, Boda Riders for errands, and many more.</li>
      <li>Support local freelancers and get your tasks done reliably.</li>
    </ul>`,
    suggestions: ["How do deliveries work?", "How can I post my service?", "I need to report an issue"]
  },

  // --- PLATFORM FEATURES ---
  "dashboard": {
    text: `⚙️ Your <a href='/dashboard/' target='_blank'>Dashboard</a> is your personal control center. From there, you can:
    <ul>
      <li>View and manage all the items you're currently selling.</li>
      <li>Track your orders and see their delivery status.</li>
      <li>Update your personal profile information.</li>
      <li>Check messages from buyers and sellers in your <a href='/inbox.html' target='_blank'>Inbox</a>.</li>
    </ul>`,
    suggestions: ["How do I track my orders?", "What is the Wishlist?", "I want to sell something"]
  },

  "orders": {
    text: `📦 You can keep track of all your purchases in the <a href='/my-orders.html' target='_blank'>My Orders</a> section. It helps you see the status of each delivery and review your purchase history with sellers.`,
    suggestions: ["How do I buy an item?", "Go to my Dashboard", "I have a problem with an order"]
  },

  "wishlist": {
    text: `❤️ The <a href='/wishlist.html' target='_blank'>Wishlist</a> is a great way to save items you're interested in but aren't ready to buy yet. It helps you keep an eye on them for later and watch for price drops!`,
    suggestions: ["How does the Shopping Cart work?", "Show me how to buy", "Explore all items"]
  },

  "cart": {
    text: `🛒 Your <a href='/cart.html' target='_blank'>Shopping Cart</a> holds all the items you've decided to purchase. From the cart, you can proceed to checkout and finalize delivery and payment arrangements with the seller.`,
    suggestions: ["How do I track my orders?", "What is the Wishlist?", "Continue shopping"]
  },

  "inbox": {
    text: `📥 Your <a href='/inbox.html' target='_blank'>Inbox</a> is where you can find all your private messages from sellers, buyers, or the site admin. It's important to check it regularly when you're buying or selling.`,
    suggestions: ["How do I contact the admin?", "Go to my Dashboard", "Help me sell an item"]
  },

  "requests": {
    text: `🙏 Can't find what you're looking for? Post a public request in the <a href='/requests/view.html' target='_blank'>User Requests</a> section! Sellers in the community might see your request and have exactly what you need.`,
    suggestions: ["How do I search for items?", "Tell me about services", "Read the blog"]
  },

  "feedback": {
    text: `⭐ Your feedback helps our community grow stronger! You can <a href='/submit-testimonial.html' target='_blank'>Share Feedback</a> to leave a testimonial about your experience or to report any issues you've encountered. We read every submission!`,
    suggestions: ["Contact the admin directly", "What is KabaleOnline about?", "How to rent a hostel"]
  },

  "blog": {
    text: `📚 Check out our <a href='/blog/' target='_blank'>Blog</a> for updates, stories from campus, safety tips for online shopping, and news about what's happening in and around Kabale.`,
    suggestions: ["Tell me about events", "Who is the founder?", "I need general help"]
  },

  "safety": {
    text: `🛡️ Your safety is our top priority. Here are some key tips for transacting on KabaleOnline:
    <ul>
      <li><b>Meet in Public:</b> Always meet sellers/buyers in well-lit, public places. The university campus is a great option.</li>
      <li><b>Inspect Before Paying:</b> Never send mobile money or cash before you have inspected the item in person and are happy with it.</li>
      <li><b>Trust Your Gut:</b> If a deal feels too good to be true or a user seems suspicious, it's okay to walk away.</li>
      <li><b>Report Issues:</b> If you have a problem with a user or see a suspicious listing, please <a href="https://wa.me/256784655792" target="_blank">contact the admin</a> immediately.</li>
    </ul>`,
    suggestions: ["How do I buy an item?", "How do I sell an item?", "Contact the admin"]
  },

  // --- KABALE ONLINE INFO (EXPANDED) ---
  "about": {
    text: `👋 I'm the <b>KabaleOnline AI Assistant</b>! I'm your personal, 24/7 guide to buying, selling, and discovering everything in our community.
    <ul>
        <li>I can answer your questions on how to use the site.</li>
        <li>I can help you find specific categories of items.</li>
        <li>I can even look up live product information from our database for you.</li>
    </ul>
    You can ask me questions like "How to sell an item?", "Show me electronics", or "Price of a laptop". What can I help you find today?`,
    suggestions: ["How do I sell an item?", "Show me electronics", "What is your mission?"]
  },

  "mission_vision": {
    text: `🎯 Our mission is to <b>empower the Kabale community</b> by making local commerce and services simple, accessible, and safe. Our vision is to be the digital heartbeat of Kabale, connecting every student and resident to the opportunities around them through user-friendly technology.`,
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
      <li><b>WhatsApp (Fastest Response):</b> <a href="https://wa.me/256784655792" target="_blank">0784655792</a></li>
      <li><b>Email/Form:</b> Send a detailed message via our <a href='/contact.html' target='_blank'>Contact Form</a>.</li>
    </ul>`,
    suggestions: []
  },

  // --- CATEGORIES ---
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

  // --- OTHER INFO ---
  "deliveries": {
    text: `🚴‍♂️ We're excited to announce that **KabaleOnline Deliveries** is coming soon! This feature will allow you to request a verified and trusted boda rider for same-day pickups and drop-offs around town. Stay tuned!`,
    suggestions: ["What services are available now?", "Are there any events?", "How to sell an item"]
  },

  "events": {
    text: `🎟️ Find out what's happening in Kabale or promote your own event!
    <ul>
      <li>Check the <a href='/events/' target='_blank'>Events Page</a> for local concerts, promotions, and community gatherings.</li>
      <li>As a promoter, you can post your event for free to reach a huge local audience and even sell tickets online.</li>
    </ul>`,
    suggestions: ["Read the campus blog", "How do I find a job?", "I need help"]
  },

  // --- THE "MASSIVELY HELPFUL" HELP SECTION ---
  "help": {
    text: `🆘 I can help with almost anything on KabaleOnline! Here’s a full guide to what I know. Just ask me a question about any of these topics:
    
    <br><strong>🛒 Shopping & Selling</strong>
    <ul>
      <li><b>"How to Buy":</b> I can explain the process of finding and purchasing items.</li>
      <li><b>"How to Sell":</b> I'll guide you on creating a great listing that sells fast.</li>
      <li><b>"Safety Tips":</b> Ask me for advice on how to transact safely.</li>
      <li><b>"Show me electronics":</b> I can provide a direct link to any product category page.</li>
      <li><b>"Price of iPhone XS":</b> Ask me about specific products to search for them live in our database.</li>
    </ul>
    
    <strong>👤 Your Account</strong>
    <ul>
      <li><b>"Dashboard":</b> Learn how to manage your account and listings.</li>
      <li><b>"My Orders":</b> I can show you where to track your purchases.</li>
      <li><b>"My Wishlist":</b> Learn about saving items for later.</li>
      <li><b>"My Inbox":</b> Find out where your messages with other users are stored.</li>
    </ul>

    <strong>🏢 About KabaleOnline</strong>
    <ul>
      <li><b>"What is your mission?":</b> Learn about our purpose and goals.</li>
      <li><b>"Who is the founder?":</b> Find out more about who created the platform.</li>
      <li><b>"When was it founded?":</b> Learn about the history of the site.</li>
    </ul>
    
    <p>If you have a serious problem or need to report a user, just ask me to "contact the admin".</p>`,
    suggestions: ["How do I sell safely?", "Tell me about the founder", "Find a hostel"]
  }
};