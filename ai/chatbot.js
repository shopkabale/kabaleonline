// File: /ai/chatbot.js (SAFE MODE TEST)

document.addEventListener('DOMContentLoaded', function () {
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');

  // Test 1: Prevent the form from reloading the page
  chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    console.log("Form submission prevented! Safe mode is working.");
    appendMessage("If you see this, the safe mode test was successful.", 'sent');
  });

  // Test 2: Add a message to the screen
  function appendMessage(text, type) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('message-wrapper', `${type}-wrapper`);
    let html = `<div class="message-content"><div class="message ${type}">${text}</div></div>`;
    if (type === 'received') {
        html = `<div class="message-block"><div class="avatar"><i class="fa-solid fa-robot"></i></div><div class="message-content"><div class="message received">${text}</div></div></div>`;
    }
    wrapper.innerHTML = html;
    chatMessages.appendChild(wrapper);
  }

  // Test 3: Display the initial welcome message
  console.log("Safe mode script loaded. Displaying welcome message.");
  appendMessage("Amara is in safe mode. If you see this, the file is loading correctly.", 'received');
});