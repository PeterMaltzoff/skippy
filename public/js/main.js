async function sendMessage() {
  const messageInput = document.getElementById('message');
  const message = messageInput.value;
  if (!message.trim()) return;
  messageInput.value = '';

  addToChat('USER', message);
  
  try {
    const response = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const data = await response.json();
    addToChat('SYSTEM', data.response);
  } catch (error) {
    console.error('Error:', error);
    addToChat('ERROR', 'Neural link disconnected. Retry transmission.');
  }
}

function addToChat(sender, message) {
  const chatHistory = document.getElementById('chat-history');
  const messageEl = document.createElement('div');
  messageEl.className = 'flex flex-col space-y-1 animate-fade-in';
  
  const senderClass = sender === 'USER' ? 'text-cyan-400' : sender === 'ERROR' ? 'text-red-500' : 'text-green-400';
  
  messageEl.innerHTML = `
    <div class="text-sm ${senderClass} font-bold">[${sender}]</div>
    <div class="bg-black/40 rounded p-3 border border-green-500/20">
      <p class="font-normal">${message}</p>
    </div>
  `;
  
  chatHistory.appendChild(messageEl);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Add event listener for Enter key
document.getElementById('message').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
}); 