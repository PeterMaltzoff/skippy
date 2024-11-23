const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/architect', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'architect.html'));
});

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3.2:3b',
      prompt: message,
      stream: true
    }, {
      responseType: 'stream'
    });

    response.data.on('data', chunk => {
      const data = JSON.parse(chunk.toString());
      if (data.response) {
        res.write(`data: ${JSON.stringify({ response: data.response })}\n\n`);
      }
      if (data.done) {
        res.end();
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to get response from Ollama' });
  }
});

app.get('/decomposition', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'decomposition.html'));
});

app.post('/decompose', async (req, res) => {
  try {
    const { task } = req.body;
    
    // First, check if the task is atomic
    const atomicCheckResponse = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3.2:3b',
      prompt: `Determine if this task is atomic (cannot be broken down further and can be directly executed on a computer). Task: "${task}". Respond with only "ATOMIC" or "NON-ATOMIC".`,
      stream: false
    });

    const isAtomic = !atomicCheckResponse.data.response.trim().includes('NON-ATOMIC');

    if (isAtomic) {
      res.json({ 
        isAtomic: true,
        task: task,
        children: []
      });
      return;
    }

    // If non-atomic, decompose into subtasks
    const decompositionResponse = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3.2:3b',
      prompt: `Break down this task into 2-5 clear, sequential subtasks. Format each subtask on a new line with no numbers or bullets: ${task}`,
      stream: false
    });

    const subtasks = decompositionResponse.data.response
      .split('\n')
      .filter(step => step.trim());

    res.json({
      isAtomic: false,
      task: task,
      children: subtasks
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to decompose task' });
  }
});

app.post('/architect/generate', async (req, res) => {
  const { command, currentState } = req.body;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // For now, just send back a test response
  res.write('data: ' + JSON.stringify({
    message: "I received your command: " + command,
    code: "// Code will be generated here\n",
    complete: true
  }) + '\n\n');
  
  res.end();
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});