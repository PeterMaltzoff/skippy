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
    const { task, parentPath, complexityThreshold } = req.body;
    
    // Create a context-aware prompt using the parent path
    const contextPrompt = parentPath.length > 1 
      ? `Given the task hierarchy:\n${parentPath.join(' > ')}\n\n` 
      : '';
    
    // First, check if the task is atomic with context
    const atomicCheckResponse = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3.2:3b',
      prompt: `you will classify a given task based on its complexity and level of abstraction. you are provided two variables:

    ${contextPrompt}: a list of parent tasks leading up to the root task, giving you context about the current task.
    ${task}: the specific task you need to classify.

rate the complexity of ${task} on a scale from 1 to 10:

    1 is a very low-level, atomic action that can be performed directly by a human with minimal effort or thought (e.g., typing text, picking up an object).
    10 is a high-level, complex action involving multiple steps, significant decision-making, or extended effort (e.g., creating something, completing a process with multiple sub-tasks).

consider the context provided in ${contextPrompt} and analyze whether ${task} is atomic or requires multiple sub-actions.

examples for guidance:

    if ${task} is "type 'cat videos' into youtube" and ${contextPrompt} includes "watch funny videos," rate it as 1 (atomic action).
    if ${task} is "grow a plant" and ${contextPrompt} includes "develop a sustainable garden," rate it as 8 (multi-step, high abstraction).

respond with a single number (1-10) as your rating.`,
      stream: false
    });

    // Extract only the numeric value from the response
    const complexityRating = parseInt(atomicCheckResponse.data.response.replace(/\D/g, ''));
    const isAtomic = complexityRating <= complexityThreshold;

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
      prompt: `${contextPrompt} Given the above context, break down this specific task into 1-4 clear, subtasks. Consider the parent tasks to avoid redundancy and maintain appropriate scope. Your goal is to generate low level tasks that can be directly performed by a human but if you can't do that, generate high level tasks. Task to decompose: "${task}". 
      rate the complexity of ${task} on a scale from 1 to 10:

      1 is a very low-level, atomic action that can be performed directly by a human with minimal effort or thought (e.g., typing text, picking up an object).
      10 is a high-level, complex action involving multiple steps, significant decision-making, or extended effort (e.g., creating something, completing a process with multiple sub-tasks).

      Format each subtask on a new line with no bullets or numbers. Each sub task should be given a complexity rating from 1 to 10.`,
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