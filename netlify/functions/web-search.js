// File: /.netlify/functions/web-search.js (Upgraded with Smart Summary Logic)

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

    // --- UPGRADE: "SMART SUMMARY" LOGIC ---

    // Step 1: Try the DuckDuckGo Instant Answer API for a high-quality summary.
    const instantAnswerUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
    const apiResponse = await axios.get(instantAnswerUrl);
    
    // Check if the API gave us a good abstract (summary).
    if (apiResponse.data.AbstractText) {
      let responseText = `<p>${apiResponse.data.AbstractText}</p>`;
      
      // If there's a source, add it with a link icon.
      if(apiResponse.data.AbstractSource && apiResponse.data.AbstractURL) {
        responseText += `<a href="${apiResponse.data.AbstractURL}" target="_blank" title="Source: ${apiResponse.data.AbstractSource}" style="text-decoration:none; font-size:1.2em;">🔗</a>`;
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          text: responseText,
          suggestions: ["Ask another question", "Help"]
        })
      };
    }

    // --- Step 2: If no instant answer, fall back to scraping the single best result. ---
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);
    
    // Find only the very first result.
    const firstResult = $('.result').first();
    const snippet = firstResult.find('.result__snippet').text().trim();
    const title = firstResult.find('.result__title a').text().trim();
    const link = 'https:' + firstResult.find('.result__url').attr('href').trim();

    if (snippet && title && link) {
      let responseText = `<p style="display:inline;">${snippet} </p><a href="${link}" target="_blank" title="View source: ${title}" style="text-decoration:none; font-size:1.2em;">🔗</a>`;
      return {
        statusCode: 200,
        body: JSON.stringify({
          text: responseText,
          suggestions: ["Ask another question", "Help"]
        })
      };
    }

    // If both methods fail, return a not found message.
    return {
      statusCode: 200,
      body: JSON.stringify({ text: `I couldn't find a good summary for "${query}". Please try rephrasing your question.` })
    };

  } catch (error) {
    console.error('Smart Summary function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ text: "Sorry, I'm having trouble searching the web right now. Please try again later." })
    };
  }
};