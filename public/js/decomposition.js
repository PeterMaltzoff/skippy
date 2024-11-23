let taskTree = null;
let isDecomposing = false;

function clearDecomposition() {
  isDecomposing = false;
  taskTree = null;
  document.getElementById('stop-button').classList.add('hidden');
  const resultDiv = document.getElementById('decomposition-result');
  resultDiv.innerHTML = '<div class="text-blue-300 text-center opacity-50">Awaiting input for decomposition...</div>';
}

async function decompose() {
  const inputText = document.getElementById('input-text').value;
  if (!inputText.trim()) return;

  const resultDiv = document.getElementById('decomposition-result');
  resultDiv.innerHTML = '<div class="text-blue-300 animate-pulse">Processing decomposition...</div>';
  
  document.getElementById('stop-button').classList.remove('hidden');
  isDecomposing = true;

  try {
    taskTree = new TreeNode(inputText);
    await decomposeNode(taskTree);
    
    const data = convertToD3Data(taskTree);
    displayTree(data);
  } catch (error) {
    console.error('Error:', error);
    if (error.message === 'Decomposition stopped by user') {
      // If we have partial results, display them
      if (taskTree) {
        const data = convertToD3Data(taskTree);
        displayTree(data);
      }
    } else {
      resultDiv.innerHTML = '<div class="text-red-400">Decomposition failed. Please try again.</div>';
    }
  } finally {
    document.getElementById('stop-button').classList.add('hidden');
    isDecomposing = false;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function decomposeNode(node) {
  if (!isDecomposing) {
    throw new Error('Decomposition stopped by user');
  }

  await delay(10);

  const currentData = convertToD3Data(taskTree);
  displayTree(currentData);

  // Get the full path of parent tasks up to the root
  const parentPath = getParentPath(node);
  
  const timeThreshold = parseInt(document.getElementById('time-threshold').value);

  const response = await fetch('/decompose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      task: node.task,
      parentPath: parentPath,
      timeThreshold: timeThreshold
    })
  });
  
  const data = await response.json();
  node.isAtomic = data.isAtomic;
  
  if (!node.isAtomic) {
    node.children = data.children.map(task => new TreeNode(task));
    await delay(10);
    
    const updatedData = convertToD3Data(taskTree);
    displayTree(updatedData);

    for (const child of node.children) {
      if (!isDecomposing) {
        throw new Error('Decomposition stopped by user');
      }
      await decomposeNode(child);
    }
  }
}

// Add this helper function to get the parent path
function getParentPath(node) {
  const path = [];
  let current = node;
  
  // Traverse up the tree to find all parents
  while (current) {
    path.unshift(current.task);
    current = findParentNode(current, taskTree);
  }
  
  return path;
}

// Helper function to find parent node
function findParentNode(node, root) {
  if (!root || !root.children) return null;
  
  for (const child of root.children) {
    if (child === node) return root;
    const parent = findParentNode(node, child);
    if (parent) return parent;
  }
  
  return null;
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

  // Create the SVG container with zoom support
  const svg = d3.create("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: 40vh; font: 14px 'Orbitron';")
    .call(d3.zoom()
      .scaleExtent([0.5, 10]) // Set zoom limits
      .on("zoom", zoomed));

  // Create a group for the entire visualization
  const g = svg.append("g");

  // Zoom function
  function zoomed(event) {
    g.attr("transform", event.transform);
  }

  // Create links with transition
  const links = g.append("g")
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
  const node = g.append("g")
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

function stopDecomposition() {
  isDecomposing = false;
  document.getElementById('stop-button').classList.add('hidden');
}

// Add event listener for Ctrl+Enter to decompose
document.getElementById('input-text').addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') decompose();
});

document.getElementById('complexity-threshold').addEventListener('input', (e) => {
  document.getElementById('threshold-value').textContent = e.target.value;
}); 