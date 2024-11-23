let taskTree = null;

function clearDecomposition() {
  taskTree = null;
  const resultDiv = document.getElementById('decomposition-result');
  resultDiv.innerHTML = '<div class="text-blue-300 text-center opacity-50">Awaiting input for decomposition...</div>';
}

async function decompose() {
  const inputText = document.getElementById('input-text').value;
  if (!inputText.trim()) return;

  const resultDiv = document.getElementById('decomposition-result');
  resultDiv.innerHTML = '<div class="text-blue-300 animate-pulse">Processing decomposition...</div>';

  try {
    // Initialize tree if it doesn't exist
    taskTree = new TreeNode(inputText);
    await decomposeNode(taskTree);
    
    // Convert tree structure to D3 hierarchy data
    const data = convertToD3Data(taskTree);
    displayTree(data);
  } catch (error) {
    console.error('Error:', error);
    resultDiv.innerHTML = '<div class="text-red-400">Decomposition failed. Please try again.</div>';
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function decomposeNode(node) {
  // Add small delay for visual effect
  await delay(10);

  // Display current state before processing
  const currentData = convertToD3Data(taskTree);
  displayTree(currentData);

  const response = await fetch('/decompose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: node.task })
  });
  
  const data = await response.json();
  node.isAtomic = data.isAtomic;
  
  if (!node.isAtomic) {
    node.children = data.children.map(task => new TreeNode(task));
    // Add small delay after adding children
    await delay(10);
    
    // Display updated state after adding children
    const updatedData = convertToD3Data(taskTree);
    displayTree(updatedData);

    // Process children sequentially
    for (const child of node.children) {
      await decomposeNode(child);
    }
  }
}

function convertToD3Data(node) {
  return {
    name: node.task,
    isAtomic: node.isAtomic,
    children: node.children.map(child => convertToD3Data(child))
  };
}

function displayTree(data) {
  const resultDiv = document.getElementById('decomposition-result');
  resultDiv.innerHTML = '';

  const nodeSize = 25;
  const root = d3.hierarchy(data).eachBefore((i => d => d.index = i++)(0));
  const nodes = root.descendants();
  const width = 800;
  const height = (nodes.length + 1) * nodeSize;

  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-nodeSize / 2, -nodeSize * 3 / 2, width, height])
    .attr("style", "max-width: 100%; height: auto; font: 14px 'Orbitron'; overflow: visible;");

  // Create links with transition
  const links = svg.append("g")
    .attr("fill", "none")
    .attr("stroke", "#60A5FA")
    .attr("stroke-opacity", 0.4)
    .selectAll("path")
    .data(root.links())
    .join("path")
    .style("opacity", 0)
    .attr("d", d => `
      M${d.source.depth * nodeSize * 1.5},${d.source.index * nodeSize}
      V${d.target.index * nodeSize}
      h${nodeSize * 1.5}
    `)
    .transition()
    .duration(500)
    .style("opacity", 1);

  // Create nodes with transition
  const node = svg.append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .attr("transform", d => `translate(0,${d.index * nodeSize})`)
    .style("opacity", 0)
    .transition()
    .duration(500)
    .style("opacity", 1);

  // Add circles for nodes
  node.selection()
    .append("circle")
    .attr("cx", d => d.depth * nodeSize * 1.5)
    .attr("r", 4)
    .attr("fill", d => d.data.isAtomic ? "#4ADE80" : "#60A5FA")
    .attr("class", "node-circle");

  // Add text labels
  node.selection()
    .append("text")
    .attr("dy", "0.32em")
    .attr("x", d => d.depth * nodeSize * 1.5 + 8)
    .attr("class", "text-sm")
    .attr("fill", d => d.data.isAtomic ? "#4ADE80" : "#60A5FA")
    .text(d => d.data.name);

  // Add hover tooltips showing full path
  node.selection()
    .append("title")
    .text(d => d.ancestors().reverse().map(d => d.data.name).join(" > "));

  resultDiv.appendChild(svg.node());
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

// Add event listener for Ctrl+Enter to decompose
document.getElementById('input-text').addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') decompose();
}); 