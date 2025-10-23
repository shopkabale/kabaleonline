import fetch from 'node-fetch';

export async function handler(event, context) {
  try {
    const { message } = JSON.parse(event.body);

    const hfKey = process.env.HUGGINGFACE_API_KEY; // ✅ Securely loaded from Netlify env vars
    if (!hfKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing Hugging Face API key in environment variables." }),
      };
    }

    const response = await fetch("https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.2", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: message,
        parameters: { max_new_tokens: 150 },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Hugging Face API Error:", err);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "AI API call failed", details: err }),
      };
    }

    const data = await response.json();
    const botReply = data[0]?.generated_text || "Sorry, I couldn’t understand that.";

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: botReply }),
    };
  } catch (error) {
    console.error("Server Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error", details: error.message }),
    };
  }
}