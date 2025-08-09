// In your blog/script.js file

async function fetchBlogPosts() {
    try {
        const response = await fetch('/.netlify/functions/get-blog-posts');

        // --- START OF DEBUGGING CODE ---
        // Let's log the raw response to the browser's console to inspect it.
        console.log('Raw response from function:', response);

        const responseData = await response.json();
        console.log('Data from function (as JSON):', responseData);
        // --- END OF DEBUGGING CODE ---

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        // Use the variable we created for debugging
        const { records } = responseData;
        postListContainer.innerHTML = ''; // Clear loading message

        if (records.length === 0) {
            postListContainer.innerHTML = '<p>No blog posts have been published yet. Check back soon!</p>';
            return;
        }

        records.forEach(record => {
            const { Title, Slug, FeaturedImage, PublishDate, Author } = record.fields;
            const imageUrl = FeaturedImage ? FeaturedImage[0].url : 'https://i.imgur.com/WJ9S92O.png';
            const postDate = new Date(PublishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            const postCard = document.createElement('a');
            postCard.className = 'blog-card-link';
            postCard.href = `/post/?slug=${Slug}`;

            postCard.innerHTML = `
                <article class="blog-card">
                    <img src="${imageUrl}" alt="${Title}">
                    <div class="blog-card-content">
                        <h3>${Title}</h3>
                        <p class="blog-card-meta">By ${Author} on ${postDate}</p>
                    </div>
                </article>
            `;
            postListContainer.appendChild(postCard);
        });
    } catch (error) {
        console.error('Error fetching blog posts:', error); // Log the actual error
        postListContainer.innerHTML = '<p>Could not load blog posts at this time.</p>';
    }
}

fetchBlogPosts();
