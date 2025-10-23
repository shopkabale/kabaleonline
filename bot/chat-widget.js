const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatBox = document.querySelector("#chat-box");

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  // Display user message
  chatBox.innerHTML += `<div class="user-msg">${message}</div>`;
  chatInput.value = "";

  // Send to Netlify function
  const res = await fetch("/.netlify/functions/aiChat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const data = await res.json();

  // Display bot reply
  chatBox.innerHTML += `<div class="bot-msg">${data.reply}</div>`;
});