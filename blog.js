// blog.js (Corrected)

const repoOwner = 'shopkabale';
const repoName = 'kabaleonline';
const postsDir = 'posts'; // <-- THIS IS THE FIX (removed the underscore)
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
        console.error('Error loading blog posts:', error);
        postsContainer.innerHTML = '<p>Sorry, there was an error loading the blog posts.</p>';
    }
}

fetchAndDisplayPosts();
