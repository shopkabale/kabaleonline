const postContainer = document.getElementById('post-content-container');

async function fetchSinglePost() {
    const slug = new URLSearchParams(window.location.search).get('slug');
    if (!slug) {
        postContainer.innerHTML = '<p>Error: No post specified.</p>';
        return;
    }

    try {
        const response = await fetch(`/.netlify/functions/get-blog-posts?slug=${slug}`);
        if (!response.ok) throw new Error('Post not found.');

        const record = await response.json();
        const { Title, Content, FeaturedImage, PublishDate, Author } = record.fields;
        
        document.title = `${Title} | Kabale Online`; // Update page title
        
        const imageUrl = FeaturedImage ? FeaturedImage[0].url : '';
        const postDate = new Date(PublishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        
        // Use the 'marked' library to convert Markdown text to HTML
        const postHTML = marked.parse(Content);

        postContainer.innerHTML = `
            <article class="blog-post-full">
                <h1>${Title}</h1>
                <p class="blog-post-meta">By ${Author} on ${postDate}</p>
                ${imageUrl ? `<img src="${imageUrl}" alt="${Title}" class="blog-post-image">` : ''}
                <div class="blog-post-body">${postHTML}</div>
            </article>

            <section class="blog-cta-section">
                <h3>Found This Interesting?</h3>
                <p>Hundreds of great deals on second-hand items are waiting for you right now.</p>
                <a href="/shop/" class="btn-cta">Browse All Products</a>
            </section>
            `;

    } catch (error) {
        postContainer.innerHTML = `<p>Sorry, we could not find that post.</p>`;
    }
}

// We need to make sure the marked library is loaded before we call the function
if (typeof marked === 'undefined') {
    // If it's not loaded, wait for the window to load completely.
    window.addEventListener('load', fetchSinglePost);
} else {
    // If it's already loaded, run the function immediately.
    fetchSinglePost();
}
