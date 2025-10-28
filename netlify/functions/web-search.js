// File: /.netlify/functions/web-search.js

const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async function (event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { query } = JSON.parse(event.body);
    if (!query) {
      return { statusCode: 400, body: 'Query is required' };
    }

    // Use DuckDuckGo to perform the search. We add headers to mimic a real browser.
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Load the HTML content into Cheerio to parse it
    const $ = cheerio.load(data);
    const results = [];

    // Find each search result container. This selector is specific to DuckDuckGo's HTML structure.
    // We limit it to the top 4 results.
    $('.result').slice(0, 4).each((index, element) => {
      const titleElement = $(element).find('.result__title a');
      const snippetElement = $(element).find('.result__snippet');
      const linkElement = $(element).find('.result__url');
      
      const title = titleElement.text().trim();
      const snippet = snippetElement.text().trim();
      // The link needs a 'https:' prefix
      const link = 'https:' + linkElement.attr('href').trim();

      // Ensure we have a valid result before adding it
      if (title && snippet && link) {
        results.push({ title, snippet, link });
      }
    });

    if (results.length === 0) {
        return {
            statusCode: 200,
            body: JSON.stringify({ text: `I couldn't find any direct web results for "${query}". Try rephrasing your search.` })
        };
    }

    // Format the results into a nice HTML string for Amara to display
    let responseText = `Here are the top web results for "<b>${query}</b>":<br><ol style="padding-left: 20px;">`;
    results.forEach(res => {
        responseText += `<li style="margin-bottom: 10px;">
            <a href="${res.link}" target="_blank">${res.title}</a><br>
            <small>${res.snippet}</small>
        </li>`;
    });
    responseText += '</ol>';

    return {
      statusCode: 200,
      body: JSON.stringify({ text: responseText, suggestions: ["How to sell", "Find another hostel"] })
    };

  } catch (error) {
    console.error('Scraper function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ text: "Sorry, I'm having trouble searching the web right now. Please try again later." })
    };
  }
};