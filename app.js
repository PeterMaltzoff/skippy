const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Serve a simple HTML form for chat
app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Chat with Ollama</h1>
        <div id="chat-history"></div>
        <input type="text" id="message" placeholder="Type your message...">
        <button onclick="sendMessage()">Send</button>

        <script>
          async function sendMessage() {
            const messageInput = document.getElementById('message');
            const message = messageInput.value;
            messageInput.value = '';

            // Display user message
            addToChat('User: ' + message);

            try {
              const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
              });
              const data = await response.json();
              addToChat('AI: ' + data.response);
            } catch (error) {
              console.error('Error:', error);
              addToChat('Error: Failed to get response');
            }
          }

          function addToChat(message) {
            const chatHistory = document.getElementById('chat-history');
            chatHistory.innerHTML += '<p>' + message + '</p>';
          }
        </script>
      </body>
    </html>
  `);
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Call Ollama API (assuming it's running on default port 11434)
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama2',  // or whatever model you have installed
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