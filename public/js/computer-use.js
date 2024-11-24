const terminal = document.getElementById('terminal');
const commandInput = document.getElementById('command-input');
const processesDiv = document.getElementById('processes');

// Add function to update processes display
async function updateProcesses() {
  try {
    const response = await fetch('/puppet/processes');
    const data = await response.json();
    
    processesDiv.innerHTML = data.processes.map(processId => `
      <div class="flex items-center justify-between p-2 bg-black/40 rounded border border-purple-500/30">
        <div>
          <div class="text-sm text-purple-300">Process ID: ${processId}</div>
          <div class="text-xs text-purple-300/70">Browser Instance</div>
        </div>
        <button onclick="stopProcess(${processId})" 
                class="text-red-400 hover:text-red-300 text-sm">
          Terminate
        </button>
      </div>
    `).join('') || '<div class="text-purple-300/50 text-sm">No active processes</div>';
  } catch (error) {
    console.error('Failed to fetch processes:', error);
  }
}

// Add function to stop process
async function stopProcess(processId) {
  try {
    await fetch('/puppet/stop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ processId })
    });
    await updateProcesses();
  } catch (error) {
    console.error('Failed to stop process:', error);
  }
}

// Update screenshot endpoint in existing code
commandInput.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    const command = commandInput.value;
    if (!command.trim()) return;

    commandInput.value = '';
    addToTerminal(`> ${command}`);

    try {
      const response = await fetch('/puppet/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          width: 1120,
          height: 1120,
          url: 'https://www.google.com',
          processId: 0
        })
      });

      if (!response.ok) throw new Error('Screenshot failed');

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      addToTerminal('screenshot:', imageUrl);
      
      // Update processes after screenshot
      await updateProcesses();
    } catch (error) {
      addToTerminal('Error: Failed to capture screenshot', null, true);
    }
  }
});

// Initial processes load
document.addEventListener('DOMContentLoaded', updateProcesses);

// Update processes every 5 seconds
setInterval(updateProcesses, 5000);

function addToTerminal(text, imageUrl = null, isError = false) {
  const div = document.createElement('div');
  div.className = `mb-2 ${isError ? 'text-red-400' : 'text-purple-300'}`;

  if (imageUrl) {
    const container = document.createElement('div');
    container.className = 'mt-2 mb-4';
    
    // Create thumbnail
    const thumbnail = document.createElement('img');
    thumbnail.src = imageUrl;
    thumbnail.className = 'w-64 h-64 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity';
    thumbnail.onclick = () => openFullImage(imageUrl);
    
    div.textContent = text;
    container.appendChild(div);
    container.appendChild(thumbnail);
    terminal.appendChild(container);
  } else {
    div.textContent = text;
    terminal.appendChild(div);
  }

  terminal.scrollTop = terminal.scrollHeight;
}

function openFullImage(imageUrl) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/90 flex items-center justify-center z-50 cursor-pointer';
  modal.onclick = () => modal.remove();

  const img = document.createElement('img');
  img.src = imageUrl;
  img.className = 'max-w-[90vw] max-h-[90vh] object-contain';

  modal.appendChild(img);
  document.body.appendChild(modal);
}
