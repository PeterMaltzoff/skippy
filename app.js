const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require('path');
const puppeteer = require('puppeteer');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/views', 'dashboard.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/views', 'chat.html'));
});

app.get('/architect', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/views', 'architect.html'));
});

app.get('/skippy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/views/skippy', 'skippy10.html'));
});

app.get('/computer-use', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/views', 'computer-use.html'));
});

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3.2-vision:11b',
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
  res.sendFile(path.join(__dirname, 'public/views', 'decomposition.html'));
});

app.post('/timeComplexity', async (req, res) => {
  try {
    const { task } = req.body;
    
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3.2-vision:11b',
      prompt: `estimate the time it would take to do the task: ${task}. Answer tersly with a number in seconds. Dont reply with anything else. Dont even give the units, only the number of seconds.`,
      stream: false
    });

    // Extract only the numeric value from the response
    const timeToComplete = parseInt(response.data.response.replace(/\D/g, ''));
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
      model: 'llama3.2-vision:11b',
      prompt: `${contextPrompt} Break down this specific task into 1-4 clear, subtasks. You are very lazy and you make a lot of assumtions. You are so lazy you dont even state your assumitons. Avoid rabit holes. Task: ${task}. Do not include bullet points or numbers and answer each task in plain text where each new task is on a new line. Only answer with tasks, no other text. Always attempt to reduce complexity on each subtask.`,
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

app.post('/screenshot', async (req, res) => {
  try {
    const { width, height } = req.body;
    
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width, height });
    
    // Navigate to current page (you might need to adjust this URL)
    // await page.goto('http://localhost:3000' + req.headers.referer.split('3000')[1]);
    
    // // Wait for content to load
    // await page.waitForSelector('.cyber-grid');
    
    // Test with YouTube
    await page.goto('https://youtube.com');
    
    // Wait for YouTube content to load
    await page.waitForSelector('#content');
    
    // Take screenshot
    const screenshot = await page.screenshot();
    
    await browser.close();
    
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': screenshot.length
    });
    
    res.end(screenshot);
    
  } catch (error) {
    console.error('Screenshot error:', error);
    res.status(500).json({ error: 'Failed to capture screenshot' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});