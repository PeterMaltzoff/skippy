const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
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

app.post('/timeComplexity', async (req, res) => {
  try {
    const { task } = req.body;
    
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3.2:3b',
      prompt: `estimate the time it would take to do the task: ${task}. Answer tersly with a number in seconds. Dont reply with anything else. Dont even give the units, only the number of seconds.`,
      stream: false
    });

    // Extract only the numeric value from the response
    const timeToComplete = parseInt(response.data.response.replace(/\D/g, ''));
    console.log(timeToComplete);
    res.json({ timeToComplete });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to estimate time complexity' });
  }
});

app.post('/decompose', async (req, res) => {
  try {
    const { task, parentPath, timeThreshold } = req.body;
    
    // Create a context-aware prompt using the parent path
    const contextPrompt = parentPath.length > 1 
      ? `Given the task hierarchy:\n${parentPath.join(' > ')}\n\n` 
      : '';
    
    // Decompose into subtasks with context
    const decompositionResponse = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3.2:3b',
      prompt: `${contextPrompt} Break down this specific task into 1-4 clear, subtasks. Task: ${task}. Do not include bullet points or numbers and answer each task in plain text where each new task is on a new line.`,
      stream: false
    });

    const subtasks = decompositionResponse.data.response
      .split('\n')
      .filter(step => step.trim());

    res.json({
      task: task,
      children: subtasks
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to decompose task' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});