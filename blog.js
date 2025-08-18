// This script fetches and displays blog posts from your GitHub repo.
const repoOwner = 'shopkabale';
const repoName = 'kabaleonline';
const postsDir = 'posts'; // NOTE: This should be 'posts', not '_posts' based on your config.yml
const postsContainer = document.getElementById('posts-container');

async function fetchAndDisplayPosts() {
    try {
        // Use the GitHub API to get the contents of the 'posts' directory
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${postsDir}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                postsContainer.innerHTML = '<p>No blog posts have been published yet. Check back soon!</p>';
                return;
            }
            throw new Error(`GitHub API error: ${response.statusText}`);
        }
        
        const files = await response.json();
        
        if (!files || files.length === 0) {
            postsContainer.innerHTML = '<p>No blog posts found yet. Check back soon!</p>';
            return;
        }

        postsContainer.innerHTML = ''; // Clear "Loading..." message

        // Sort files by name descending to show newest first
        files.sort((a, b) => b.name.localeCompare(a.name));

        // Fetch the content of each post file
        for (const file of files) {
            if (file.type === 'file' && file.name.endsWith('.md')) {
                const postResponse = await fetch(file.download_url);
                const postContent = await postResponse.text();

                // Use libraries to parse the post
                const matter = window.grayMatter; // from gray-matter.min.js
                const parsedPost = matter(postContent);
                const postData = parsedPost.data; // Title, Date, etc.
                const postHtml = window.marked.parse(parsedPost.content); // from marked.min.js

                // Create the HTML for the post preview
                const postElement = document.createElement('article');
                postElement.className = 'post-preview';
                
                const formattedDate = new Date(postData.date).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });

                postElement.innerHTML = `
                    <h2>${postData.title}</h2>
                    <p class="post-meta">Published on ${formattedDate} by ${postData.author || 'Kabale Online'}</p>
                    <div class="post-excerpt">${postHtml.substring(0, 400)}...</div>
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
