// File: /.netlify/functions/web-search.js (Upgraded with Detailed Formatting)

const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { query } = JSON.parse(event.body);
    if (!query) {
      return { statusCode: 400, body: 'Query is required' };
    }

    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);
    const results = [];

    // We'll grab the top 3 results for a clean, detailed look.
    $('.result').slice(0, 3).each((index, element) => {
      const titleElement = $(element).find('.result__title a');
      const snippetElement = $(element).find('.result__snippet');
      const linkElement = $(element).find('.result__url');
      
      const title = titleElement.text().trim();
      const snippet = snippetElement.text().trim();
      const link = 'https:' + linkElement.attr('href').trim();

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

    // --- UPGRADE: New Detailed Formatting Logic ---
    // Instead of a simple list, we build "result cards" for a richer look.
    // This removes the raw links from the main text and focuses on the explanation.

    let responseText = `Here are the best summaries I found on the web for "<b>${query}</b>":<br><br>`;
    
    results.forEach((res, index) => {
        // The main content is the snippet (the explanation).
        responseText += `<p>${res.snippet}</p>`;
        
        // We provide the source discreetly at the end of each summary.
        responseText += `<small><em>Source: <a href="${res.link}" target="_blank">${res.title}</a></em></small>`;

        // Add a separator between results, but not after the last one.
        if (index < results.length - 1) {
            responseText += '<hr style="border: none; border-top: 1px solid #e9ecef; margin: 15px 0;">';
        }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ 
          text: responseText, 
          suggestions: ["Ask another question", "Help"] 
      })
    };

  } catch (error) {
    console.error('Scraper function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ text: "Sorry, I'm having trouble searching the web right now. Please try again later." })
    };
  }
};