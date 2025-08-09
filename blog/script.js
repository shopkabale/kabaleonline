async function fetchBlogPosts() {
    try {
        const response = await fetch('/.netlify/functions/get-blog-posts');
        if (!response.ok) throw new Error('Failed to load posts.');

        const { records } = await response.json();
        postListContainer.innerHTML = ''; // Clear loading message

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
        postListContainer.innerHTML = '<p>Could not load blog posts at this time.</p>';
    }
}

fetchBlogPosts();
