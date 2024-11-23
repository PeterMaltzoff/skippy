let taskTree = null;

async function decompose() {
  const inputText = document.getElementById('input-text').value;
  if (!inputText.trim()) return;

  const resultDiv = document.getElementById('decomposition-result');
  resultDiv.innerHTML = '<div class="text-blue-300 animate-pulse">Processing decomposition...</div>';

  // Initialize tree if it doesn't exist
  if (!taskTree) {
    taskTree = new TreeNode(inputText);
  }

  try {
    await decomposeNode(taskTree);
    displayTree(taskTree);
  } catch (error) {
    console.error('Error:', error);
    resultDiv.innerHTML = '<div class="text-red-400">Decomposition failed. Please try again.</div>';
  }
}

async function decomposeNode(node) {
  const response = await fetch('/decompose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: node.task })
  });
  
  const data = await response.json();
  node.isAtomic = data.isAtomic;
  
  if (!node.isAtomic) {
    node.children = data.children.map(task => new TreeNode(task));
  }
}

function displayTree(node, level = 0, container = null) {
  if (!container) {
    const resultDiv = document.getElementById('decomposition-result');
    resultDiv.innerHTML = '';
    container = resultDiv;
  }

  const nodeElement = document.createElement('div');
  nodeElement.className = 'flex items-start space-x-4 fade-in';
  nodeElement.style.marginLeft = `${level * 20}px`;

  const taskClass = node.isAtomic ? 'bg-green-400/20 border-green-300/50' : 'bg-blue-400/20 border-blue-300/50';
  
  nodeElement.innerHTML = `
    <div class="flex-1 ${taskClass} rounded p-3 border my-2">
      <p class="text-blue-200">${node.task}</p>
      ${node.isAtomic ? '<span class="text-xs text-green-400">[Atomic]</span>' : ''}
      ${!node.isAtomic && node.children.length === 0 ? 
        `<button onclick="expandNode(this)" class="text-xs text-blue-400 hover:text-blue-300">
          [Expand]
        </button>` : ''}
    </div>
  `;

  container.appendChild(nodeElement);

  node.children.forEach(child => {
    displayTree(child, level + 1, container);
  });
}

async function expandNode(button) {
  // Find the corresponding node in the tree
  const taskText = button.parentElement.querySelector('p').textContent;
  const node = findNodeByTask(taskTree, taskText);
  
  if (node) {
    await decomposeNode(node);
    displayTree(taskTree);
  }
}

function findNodeByTask(node, task) {
  if (node.task === task) return node;
  for (const child of node.children) {
    const found = findNodeByTask(child, task);
    if (found) return found;
  }
  return null;
}

function clearDecomposition() {
  taskTree = null;
  document.getElementById('input-text').value = '';
  document.getElementById('decomposition-result').innerHTML = 
    '<div class="text-blue-300 text-center opacity-50">Awaiting input for decomposition...</div>';
}

// Add event listener for Ctrl+Enter to decompose
document.getElementById('input-text').addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') decompose();
}); 