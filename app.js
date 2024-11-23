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

app.post('/decompose', async (req, res) => {
  try {
    const { task, parentPath } = req.body;
    
    // Create a context-aware prompt using the parent path
    const contextPrompt = parentPath.length > 1 
      ? `Given the task hierarchy:\n${parentPath.join(' > ')}\n\n` 
      : '';
    
    // First, check if the task is atomic with context
    const atomicCheckResponse = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3.2:3b',
      prompt: `${contextPrompt} Considering the full context above, determine if this specific task is atomic. Task: "${task}". Consider a task atomic if its something a human can do directly and breaking it down further wouldn't be useful. Respond with only "ATOMIC" or "NON-ATOMIC".`,
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

    // If non-atomic, decompose into subtasks with context
    const decompositionResponse = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3.2:3b',
      prompt: `${contextPrompt} Given the above context, break down this specific task into 2-4 clear, more detailed subtasks. Consider the parent tasks to avoid redundancy and maintain appropriate scope. Your goal is to generate low level tasks that can be directly performed by a human but if you can't do that, generate high level tasks. Task to decompose: "${task}". Format each subtask on a new line with no numbers or bullets.`,
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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});