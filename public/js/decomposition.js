async function decompose() {
  const inputText = document.getElementById('input-text').value;
  if (!inputText.trim()) return;

  const resultDiv = document.getElementById('decomposition-result');
  resultDiv.innerHTML = '<div class="text-blue-300 animate-pulse">Processing decomposition...</div>';

  try {
    const response = await fetch('/decompose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: inputText })
    });
    
    const data = await response.json();
    displayDecomposition(data.steps);
  } catch (error) {
    console.error('Error:', error);
    resultDiv.innerHTML = '<div class="text-red-400">Decomposition failed. Please try again.</div>';
  }
}

function displayDecomposition(steps) {
  const resultDiv = document.getElementById('decomposition-result');
  resultDiv.innerHTML = '';

  steps.forEach((step, index) => {
    const stepElement = document.createElement('div');
    stepElement.className = 'flex items-start space-x-4 fade-in';
    stepElement.innerHTML = `
      <div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-400/20 flex items-center justify-center border border-blue-300/50">
        <span class="text-blue-300">${index + 1}</span>
      </div>
      <div class="flex-1 bg-slate-700/40 rounded p-3 border border-blue-300/30">
        <p class="text-blue-200">${step}</p>
      </div>
    `;
    resultDiv.appendChild(stepElement);
  });
}

function clearDecomposition() {
  document.getElementById('input-text').value = '';
  document.getElementById('decomposition-result').innerHTML = 
    '<div class="text-blue-300 text-center opacity-50">Awaiting input for decomposition...</div>';
}

// Add event listener for Ctrl+Enter to decompose
document.getElementById('input-text').addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') decompose();
}); 