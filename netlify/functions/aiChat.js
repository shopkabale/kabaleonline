import fetch from "node-fetch";

export const handler = async (event) => {
  try {
    const { message } = JSON.parse(event.body);
    const API_KEY = process.env.HUGGINGFACE_API_KEY;

    const response = await fetch("https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: message })
    });

    const data = await response.json();
    let reply = data?.[0]?.generated_text || "Sorry, I didn’t get that.";

    return {
      statusCode: 200,
      body: JSON.stringify({ reply })
    };
  } catch (error) {
    console.error("AI Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: "⚠️ Sorry, the AI assistant is currently unavailable. Try again later." })
    };
  }
};