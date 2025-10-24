const answers = {
  // --- CORE FEATURES ---

  "greetings": {
    text: "👋 Hello there! Welcome to the KabaleOnline Assistant. I can help you find items, post listings, get support, and much more. What can I help you with today?",
    suggestions: ["How to sell something?", "Find a hostel", "I need help with my account"]
  },

  "rent": {
    text: `🏠 Looking for a place to stay in Kabale? You're in the right place. Here's how to find your next home:
    <ul>
      <li>Start by browsing all listings in our <a href='/rentals/' target='_blank'>Hostels & Rentals</a> section.</li>
      <li>Use filters to narrow your search by type: Single Rooms, Full Houses, Hostels, or even Shop Spaces.</li>
      <li><b>Pro Tip:</b> Always visit a place before making a payment. If a deal seems too good to be true, it might be.</li>
    </ul>`,
    suggestions: ["How do I sell an item?", "Are there jobs available?", "What is KabaleOnline?"]
  },

  "sell": {
    text: `🛍️ Selling on KabaleOnline is easy, free, and a great way to make extra cash! Here's how to create a listing that gets noticed:
    <ul>
      <li>First, head over to the <a href='/upload/' target='_blank'>Upload Item Page</a>.</li>
      <li><b>Photos are key!</b> Upload multiple, clear, well-lit photos of your item from different angles.</li>
      <li>Write a descriptive title and a detailed description. Mention the condition, size, and any special features.</li>
      <li>Set a fair price by checking what similar items are selling for.</li>
    </ul>`,
    suggestions: ["How do I buy safely?", "How do I manage my listings?", "Contact the admin"]
  },

  "buy": {
    text: `💰 Ready to find a great deal? Here’s how to shop smart and safely on KabaleOnline:
    <ul>
      <li>Explore everything for sale on the <a href='/shop/' target='_blank'>All Items</a> page. Use the search bar for specifics!</li>
      <li>See something you like? Add it to your <a href='/cart.html' target='_blank'>Cart</a> or save it for later in your <a href='/wishlist.html' target='_blank'>Wishlist</a>.</li>
      <li><b>Safety First:</b> Always arrange to meet sellers in a safe, public place. Never send money before you've seen and are happy with the item.</li>
    </ul>`,
    suggestions: ["How do I track my orders?", "How does the Wishlist work?", "I have a problem with a seller"]
  },

  "lost": {
    text: `📄 We can help reconnect lost and found items in the community. It's a vital service for everyone.
    <ul>
      <li>If you've lost something, check the <a href='/lost-and-found/' target='_blank'>Lost & Found</a> section first.</li>
      <li>If you've found an item, please post it! Include a photo and details about where you found it. You could make someone's day.</li>
      <li>This is especially important for critical items like National IDs, school documents, keys, and phones.</li>
    </ul>`,
    suggestions: ["How do I post an item?", "Read the campus blog", "Are there any events?"]
  },

  "jobs": {
    text: `💼 Whether you're hiring or looking for work, our platform connects local talent with opportunities.
    <ul>
      <li><b>For Job Seekers:</b> Visit our <a href='/services/employment' target='_blank'>Employment Section</a> to find the latest part-time jobs, full-time positions, and internships.</li>
      <li><b>For Employers:</b> You can post your job openings for free to reach hundreds of skilled students and residents in Kabale.</li>
    </ul>`,
    suggestions: ["What kind of services can I find?", "Tell me about the founder", "I need general help"]
  },

  "services": {
    text: `🧰 Need a professional? Our Services Hub connects you with skilled local experts for any task.
    <ul>
      <li>Visit the <a href='https://gigs.kabaleonline.com' target='_blank'>Services Hub</a> to browse providers.</li>
      <li>You can find Plumbers, Electricians, Tutors, Photographers, DJs, Mechanics, Boda Riders for errands, and many more.</li>
      <li>Support local freelancers and get your tasks done reliably.</li>
    </ul>`,
    suggestions: ["How do deliveries work?", "How can I post my service?", "I need to report an issue"]
  },

  // --- PLATFORM FEATURES ---

  "dashboard": {
    text: `⚙️ Your <a href='/dashboard/' target='_blank'>Dashboard</a> is your personal control center. From there, you can:
    <ul>
      <li>View and manage all the items you're selling.</li>
      <li>Track your orders and see their status.</li>
      <li>Update your personal profile information.</li>
      <li>Check messages in your <a href='/inbox.html' target='_blank'>Inbox</a>.</li>
    </ul>`,
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
    text: `🛒 Your <a href='/cart.html' target='_blank'>Shopping Cart</a> holds all the items you've decided to purchase. From the cart, you can proceed to checkout and finalize arrangements with the seller.`,
    suggestions: ["How do I track my orders?", "What is the Wishlist?", "Continue shopping"]
  },

  "inbox": {
    text: `📥 Your <a href='/inbox.html' target='_blank'>Inbox</a> is where you can find all messages from sellers, buyers, or the site admin. It's important to check it regularly when you're transacting.`,
    suggestions: ["How do I contact the admin?", "Go to my Dashboard", "Help me sell an item"]
  },

  "requests": {
    text: `🙏 Can't find what you're looking for? Post in the <a href='/requests/view.html' target='_blank'>User Requests</a> section! Sellers in the community might see your request and have exactly what you need.`,
    suggestions: ["How do I search for items?", "Tell me about services", "Read the blog"]
  },

  "feedback": {
    text: `⭐ Your feedback helps our community grow stronger! You can <a href='/submit-testimonial.html' target='_blank'>Share Feedback</a> to leave a testimonial about your experience or to report any issues you've encountered. We appreciate it!`,
    suggestions: ["Contact the admin directly", "What is KabaleOnline about?", "How to rent a hostel"]
  },

  "blog": {
    text: `📚 Check out our <a href='/blog/' target='_blank'>Blog</a> for updates, stories, safety tips for online shopping, and news about what's happening on campus and around Kabale.`,
    suggestions: ["Tell me about events", "Who is the founder?", "I need general help"]
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

  "about": {
    text: `💡 **About KabaleOnline:** We are a digital platform built by a student, for students and the entire Kabale community.
    <ul>
      <li>Our mission is to connect people with services, power local business, and make campus life easier through technology.</li>
      <li>The platform was founded and is run by **AMPEIRE SAMUEL**.</li>
    </ul>`,
    suggestions: ["How do I contact the admin?", "How can I help?", "How to sell something"]
  },

  "contact": {
    text: `📞 For any technical problems, reporting a user, or complex issues that require direct help, please contact the admin.
    <ul>
      <li><b>WhatsApp (Fastest Response):</b> <a href="https://wa.me/256784655792" target="_blank">0784655792</a></li>
      <li><b>Email/Form:</b> Send a detailed message via our <a href='/contact.html' target='_blank'>Contact Form</a>.</li>
    </ul>`,
    suggestions: [] // No suggestions after providing direct contact info
  },
// Add these new answers to your answers.js file

"category_electronics": {
  text: `Great! Here are all the electronics listings. You can find phones, laptops, and more.
  <ul>
    <li><a href="/shop/?category=Electronics" target="_blank">Browse all Electronics</a></li>
  </ul>`,
  suggestions: ["Show me clothing", "How do I sell my phone?"]
},

"category_clothing": {
  text: `Of course! Check out the latest in fashion from sellers in Kabale.
  <ul>
    <li><a href="/shop/?category=Clothing+%26+Apparel" target="_blank">Browse all Clothing & Apparel</a></li>
  </ul>`,
  suggestions: ["Do you have furniture?", "How to sell an item"]
},

"category_furniture": {
  text: `Yes, we do. You can find items to furnish your room or hostel right here.
  <ul>
    <li><a href="/shop/?category=Home+%26+Furniture" target="_blank">Browse all Home & Furniture</a></li>
  </ul>`,
  suggestions: ["Show me electronics", "I need help"]
},

// Add this new "specific_products" category to your responses.js file

"specific_products": [
  "iphone xs",
  "airtel mifi",
  "handbag",
  "textbook",
  "laptop",
  "samsung phone",
  "nike shoes"
],



  "help": {
    text: `🆘 Of course! I can help with many things. Here is a full guide to the platform's features:
    <ul>
      <li><b>Shopping:</b> <a href='/shop/' target='_blank'>Browse & Buy Items</a> safely.</li>
      <li><b>Selling:</b> <a href='/upload/' target='_blank'>Sell or Upload Items</a> for free.</li>
      <li><b>Housing:</b> <a href='/rentals/' target='_blank'>Find Hostels & Rentals</a>.</li>
      <li><b>Services:</b> <a href='https://gigs.kabaleonline.com' target='_blank'>Offer or Book Local Services</a>.</li>
      <li><b>Events:</b> <a href='/events/' target='_blank'>Explore or Promote Events</a>.</li>
      <li><b>Account:</b> Manage everything from your <a href='/dashboard/' target='_blank'>Dashboard</a>.</li>
    </ul>
    <p>If you can't find what you're looking for, please <a href="https://wa.me/256784655792" target="_blank">contact the admin on WhatsApp</a>.</p>`,
    suggestions: ["How to sell?", "Find a rental", "Contact admin"]
  }
};