const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require('path');
const browserManager = require('./browserManager');

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
app.post('/puppet/screenshot', async (req, res) => {
  try {
    const { width, height, url, processId = 0 } = req.body;
    
    if (!url) {
      throw new Error('URL is required');
    }

    const process = await browserManager.getOrCreateProcess(processId);
    const { page } = process;
    
    // Set viewport size
    await page.setViewport({ width, height });
    
    // Navigate to specified URL
    await page.goto(url);
    
    // Wait a second for the page to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take screenshot
    const screenshot = await page.screenshot();
    
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

app.post('/puppet/stop', async (req, res) => {
  const { processId } = req.body;
  await browserManager.stopProcess(processId);
  res.json({ success: true });
});

app.get('/puppet/processes', async (req, res) => {
  const processes = browserManager.getActiveProcesses();
  res.json({ processes });
});

app.post('/puppet/task', async (req, res) => {
  try {
    const { width, height, url, processId = 0, task } = req.body;
    
    if (!url || !task) {
      throw new Error('URL and task are required');
    }

    const process = await browserManager.getOrCreateProcess(processId);
    const { page } = process;
    
    // Set viewport size
    await page.setViewport({ width, height });
    
    // Navigate to specified URL
    await page.goto(url);
    
    // Wait a second for the page to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Inject and execute JavaScript to draw coordinates
    await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Configuration
      const GRID_SPACING = 100;
      
      // Set canvas size to viewport size
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Style for the coordinates
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      // Draw coordinates in a grid pattern
      for (let x = 0; x <= canvas.width; x += GRID_SPACING) {
        for (let y = 0; y <= canvas.height; y += GRID_SPACING) {
          // Draw text outline
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.lineWidth = 3;
          ctx.strokeText(`${x},${y}`, x + 2, y + 2);
          
          // Draw text fill
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillText(`${x},${y}`, x + 2, y + 2);
        }
      }
      
      // Position the canvas as an overlay
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '10000';
      
      document.body.appendChild(canvas);
    });

    // Take screenshot
    const screenshot = await page.screenshot();
    
    // Convert screenshot to base64
    const base64Image = screenshot.toString('base64');

    // Send to Ollama with the vision model
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3.2-vision:11b',
      role: 'user',
      prompt: `The users instruction is "${task}". Based on this pixel labeled image of a computer screen, write puppeteer code to perform the next step of the task.`,
      images: [base64Image],
      stream: false
    });
    // Extract JavaScript code from the response
    const suggestion = response.data.response;
    let code = '';
    
    // Look for code block between triple backticks
    const codeMatch = suggestion.match(/```(?:javascript|js)?\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      code = codeMatch[1].trim();
    } else {
      console.log(`No code block found in response: ${suggestion}`);
    }

    // Clean up the Puppeteer code
    code = await cleanPuppeteerCode(code);

    res.json({ 
      suggestion: code,
      screenshot: base64Image
    });
    
  } catch (error) {
    console.error('Task error:', error);
    res.status(500).json({ error: 'Failed to process task' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

process.on('SIGINT', async () => {
  await browserManager.stopAllProcesses();
  process.exit();
});

async function cleanPuppeteerCode(code) {
  console.log(`Cleaning up puppeteer code: ${code}`);
  const response = await axios.post('http://localhost:11434/api/generate', {
    model: 'llama3.2-vision:11b',
    role: 'user',
    prompt: `Clean up the following puppeteer code: ${code}. Remove any comments and remove all imports and initializations of browser and page. Remove the first page.goto if present. Also remove any closing brackets and browser.close().`,
    stream: false
  });

  // Look for code block between triple backticks
  const codeMatch = response.data.response.match(/```(?:javascript|js)?\s*([\s\S]*?)\s*```/);
  if (codeMatch) {
    code = codeMatch[1].trim();
  } else {
    console.log(`No code block found in response: ${response.data.response}`);
  }
  
  return code.trim();
}