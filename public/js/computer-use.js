const terminal = document.getElementById('terminal');
const commandInput = document.getElementById('command-input');

// Handle command input
commandInput.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    const command = commandInput.value;
    if (!command.trim()) return;

    // Clear input
    commandInput.value = '';

    // Add command to terminal
    addToTerminal(`> ${command}`);

    // Take screenshot
    try {
      const response = await fetch('/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          width: 1120,
          height: 1120
        })
      });

      if (!response.ok) throw new Error('Screenshot failed');

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      // Add screenshot to terminal
      addToTerminal('screenshot:', imageUrl);
    } catch (error) {
      addToTerminal('Error: Failed to capture screenshot', null, true);
    }
  }
});

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
