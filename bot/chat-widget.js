// Chatbot front-end logic

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// Helper: Add message bubble to chat box
function addMessage(sender, text) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.innerText = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Helper: Show typing animation
function showThinking() {
  const div = document.createElement("div");
  div.classList.add("message", "bot");
  div.innerHTML = `<div class="typing"><span></span><span></span><span></span></div>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}

// Load local fallback data
let trainingData = {};
fetch("chatbot-training-data.json")
  .then(res => res.json())
  .then(data => (trainingData = data))
  .catch(() => console.warn("⚠️ Could not load fallback data."));

// Main chat flow
async function handleMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  // Display user message
  addMessage("user", message);
  userInput.value = "";

  // Show typing indicator
  const thinking = showThinking();

  try {
    const res = await fetch("/.netlify/functions/aiChat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const data = await res.json();
    chatBox.removeChild(thinking);
    addMessage("bot", data.reply || "Sorry, I didn't get that.");
  } catch (err) {
    console.error("AI error, using fallback:", err);
    chatBox.removeChild(thinking);
    const reply = getFallbackReply(message);
    addMessage("bot", reply);
  }
}

// Fallback local AI (keyword-based)
function getFallbackReply(message) {
  message = message.toLowerCase();
  if (message.includes("hello") || message.includes("hi"))
    return trainingData.greetings?.[0];
  for (const key in trainingData.faq) {
    if (message.includes(key)) return trainingData.faq[key];
  }
  return trainingData.fallback?.[Math.floor(Math.random() * trainingData.fallback.length)];
}

// Event listeners
sendBtn.addEventListener("click", handleMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleMessage();
});