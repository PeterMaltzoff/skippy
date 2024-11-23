async function sendMessage() {
  const messageInput = document.getElementById('message');
  const message = messageInput.value;
  if (!message.trim()) return;
  messageInput.value = '';

  addToChat('USER', message);
  
  try {
    const messageContainer = document.createElement('div');
    messageContainer.className = 'flex flex-col space-y-1 animate-fade-in';
    messageContainer.innerHTML = `
      <div class="text-sm text-green-400 font-bold">[SYSTEM]</div>
      <div class="bg-black/40 rounded p-3 border border-green-500/20">
        <p class="font-normal"></p>
      </div>
    `;
    
    document.getElementById('chat-history').appendChild(messageContainer);
    const textEl = messageContainer.querySelector('p');
    let fullResponse = '';

    const response = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          fullResponse += data.response;
          textEl.textContent = fullResponse;
        }
      }
    }
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