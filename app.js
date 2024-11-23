const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html class="bg-black">
    <head>
      <title>Neural Link // Ollama Interface</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        @keyframes glitch {
          0% { transform: translate(0) }
          20% { transform: translate(-2px, 2px) }
          40% { transform: translate(-2px, -2px) }
          60% { transform: translate(2px, 2px) }
          80% { transform: translate(2px, -2px) }
          100% { transform: translate(0) }
        }
        .glitch-text:hover {
          animation: glitch 0.3s linear infinite;
          text-shadow: 2px 2px #ff00ff, -2px -2px #00ffff;
        }
        .matrix-bg {
          background: linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,32,0,0.95) 100%);
        }
      </style>
    </head>
    <body class="min-h-screen matrix-bg text-green-400 font-['Orbitron']">
      <div class="container mx-auto p-4">
        <h1 class="text-4xl font-bold text-center mb-8 glitch-text">NEURAL LINK v1.0</h1>
        
        <div class="max-w-4xl mx-auto bg-black/50 rounded-lg border border-green-500/50 p-6 backdrop-blur-sm">
          <div id="chat-history" class="space-y-4 h-[60vh] overflow-y-auto mb-6 scrollbar-thin scrollbar-thumb-green-500 scrollbar-track-transparent">
          </div>
          
          <div class="flex gap-4">
            <input type="text" 
                   id="message" 
                   class="flex-1 bg-black/30 text-green-400 border border-green-500/50 rounded-lg p-3 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 placeholder-green-700"
                   placeholder="Initialize neural handshake..." />
            <button onclick="sendMessage()" 
                    class="bg-green-500/20 hover:bg-green-500/40 text-green-400 px-6 py-3 rounded-lg border border-green-500/50 transition-all duration-300 hover:shadow-[0_0_15px_rgba(34,197,94,0.5)] focus:outline-none">
              TRANSMIT
            </button>
          </div>
        </div>
      </div>

      <script>
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
          
          messageEl.innerHTML = \`
            <div class="text-sm \${senderClass} font-bold">[\${sender}]</div>
            <div class="bg-black/40 rounded p-3 border border-green-500/20">
              <p class="font-normal">\${message}</p>
            </div>
          \`;
          
          chatHistory.appendChild(messageEl);
          chatHistory.scrollTop = chatHistory.scrollHeight;
        }

        // Add event listener for Enter key
        document.getElementById('message').addEventListener('keypress', (e) => {
          if (e.key === 'Enter') sendMessage();
        });
      </script>
    </body>
    </html>
  `);
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3.2',
      prompt: message,
      stream: false
    });

    res.json({ response: response.data.response });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to get response from Ollama' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});