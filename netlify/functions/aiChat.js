import fs from "fs";
import path from "path";

export async function handler(event) {
  try {
    const { message } = JSON.parse(event.body || "{}");
    if (!message) {
      return { statusCode: 400, body: JSON.stringify({ reply: "No message received." }) };
    }

    const text = message.toLowerCase();

    // Load local data
    const basePath = path.resolve("./bot/data");
    const responses = JSON.parse(fs.readFileSync(path.join(basePath, "responses.json")));
    const answers = JSON.parse(fs.readFileSync(path.join(basePath, "answers.json")));

    // Match user message with keywords
    for (const key in responses) {
      if (responses[key].some(word => text.includes(word))) {
        return {
          statusCode: 200,
          body: JSON.stringify({ reply: answers[key] }),
        };
      }
    }

    // Default fallback
    return {
      statusCode: 200,
      body: JSON.stringify({
        reply:
          "🤖 I'm not sure I understand yet, but you can visit www.kabaleonline.com for help or contact support on WhatsApp.",
      }),
    };
  } catch (err) {
    console.error("Offline AI Chat Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: "Internal error occurred. Please try again later." }),
    };
  }
}