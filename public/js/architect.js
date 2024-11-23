class GameEngine {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    
    // Player properties
    this.player = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      radius: 5,
      speed: 5,
      color: '#fff'
    };
    
    // Track pressed keys
    this.keys = {
      ArrowLeft: false,
      ArrowRight: false,
      ArrowUp: false,
      ArrowDown: false
    };

    // Bind event listeners
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    window.addEventListener('resize', () => this.resizeCanvas());

    // Start game loop
    this.gameLoop();
  }

  resizeCanvas() {
    // Make canvas fill its container while maintaining aspect ratio
    const container = this.canvas.parentElement;
    const containerWidth = container.clientWidth;
    this.canvas.width = containerWidth;
    this.canvas.height = containerWidth * (9/16); // 16:9 aspect ratio
  }

  handleKeyDown(e) {
    if (this.keys.hasOwnProperty(e.key)) {
      this.keys[e.key] = true;
    }
  }

  handleKeyUp(e) {
    if (this.keys.hasOwnProperty(e.key)) {
      this.keys[e.key] = false;
    }
  }

  update() {
    // Update player position based on key states
    if (this.keys.ArrowLeft) this.player.x -= this.player.speed;
    if (this.keys.ArrowRight) this.player.x += this.player.speed;
    if (this.keys.ArrowUp) this.player.y -= this.player.speed;
    if (this.keys.ArrowDown) this.player.y += this.player.speed;

    // Keep player within canvas bounds
    this.player.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.player.x));
    this.player.y = Math.max(this.player.radius, Math.min(this.canvas.height - this.player.radius, this.player.y));
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw player dot with neon glow effect
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = this.player.color;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  gameLoop() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }

  getGameState() {
    return {
      canvas: {
        width: this.canvas.width,
        height: this.canvas.height
      },
      player: { ...this.player },
      // We'll add more state properties as we add features
    };
  }
}

// Initialize game when page loads
window.addEventListener('load', () => {
  new GameEngine();
}); 

let gameInstance;

// Initialize game and store instance when page loads
window.addEventListener('load', () => {
  gameInstance = new GameEngine();
});

async function sendCommand() {
  const input = document.getElementById('commandInput');
  const command = input.value;
  if (!command.trim()) return;
  
  // Clear input
  input.value = '';
  
  // Add user message to chat
  addToChatHistory('USER', command);
  
  try {
    const response = await fetch('/architect/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        command,
        currentState: gameInstance.getGameState() // We'll implement this later
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let codePreview = '';
    
    // Add AI response container
    const responseContainer = addToChatHistory('SYSTEM', '');
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          codePreview += data.code || '';
          
          // Update code preview
          document.getElementById('codePreview').textContent = codePreview;
          
          // Update AI response
          if (data.message) {
            responseContainer.textContent = data.message;
          }
          
          // If code is complete, try to apply it
          if (data.complete) {
            try {
              eval(codePreview); // In production, we'd want a safer way to execute code
            } catch (error) {
              addToChatHistory('ERROR', 'Failed to apply changes: ' + error.message);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    addToChatHistory('ERROR', 'Neural connection failed. Please try again.');
  }
}

function addToChatHistory(type, content) {
  const chatHistory = document.getElementById('chatHistory');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'mt-3';
  
  const typeClass = {
    'USER': 'text-cyan-300',
    'SYSTEM': 'text-green-300/80',
    'ERROR': 'text-red-400'
  }[type];
  
  messageDiv.innerHTML = `
    <div class="text-xs ${typeClass}">[ ${type} ]</div>
    <div class="text-sm mt-1">${content}</div>
  `;
  
  chatHistory.appendChild(messageDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  
  return messageDiv.querySelector('.text-sm'); // Return content element for potential updates
} 