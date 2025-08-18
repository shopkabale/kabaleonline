const repoOwner = 'shopkabale';
const repoName = 'kabaleonline';
const postsDir = 'posts';
const postsContainer = document.getElementById('posts-container');

async function fetchAndDisplayPosts() {
    try {
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${postsDir}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                postsContainer.innerHTML = '<p>No blog posts have been published yet. Check back soon!</p>';
                return;
            }
            throw new Error(`GitHub API error: ${response.statusText}`);
        }
        
        const files = await response.json();
        
        if (!files || files.length === 0 || files.message === "Not Found") {
            postsContainer.innerHTML = '<p>No blog posts found yet. Check back soon!</p>';
            return;
        }

        postsContainer.innerHTML = '';
        files.sort((a, b) => b.name.localeCompare(a.name));

        for (const file of files) {
            if (file.type === 'file' && file.name.endsWith('.md')) {
                const postResponse = await fetch(file.download_url);
                const postContent = await postResponse.text();

                // These are the most likely points of failure
                if (typeof window.grayMatter === 'undefined') {
                    throw new Error('The gray-matter library is not loaded.');
                }
                if (typeof window.marked === 'undefined') {
                    throw new Error('The marked.js library is not loaded.');
                }

                const matter = window.grayMatter;
                const parsedPost = matter(postContent);
                const postData = parsedPost.data;
                const postHtml = window.marked.parse(parsedPost.content);

                const postElement = document.createElement('article');
                postElement.className = 'post-preview';
                
                const formattedDate = new Date(postData.date).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });

                postElement.innerHTML = `
                    <a href="#" class="post-link" data-path="${file.path}">
                        <h2>${postData.title}</h2>
                        <p class="post-meta">Published on ${formattedDate} by ${postData.author || 'Kabale Online'}</p>
                        <div class="post-excerpt">${postHtml.substring(0, 400)}...</div>
                    </a>
                `;
                postsContainer.appendChild(postElement);
            }
        }
    } catch (error) {
        console.error('Detailed Error:', error);
        // Show the specific error message in an alert
        alert(`A technical error occurred. Please take a screenshot of this message:\n\nError: ${error.message}`);
        postsContainer.innerHTML = `<p>A technical error occurred while loading posts. Please check the alert message for details.</p>`;
    }
}

fetchAndDisplayPosts();
