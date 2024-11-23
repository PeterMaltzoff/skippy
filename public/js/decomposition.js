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

function displayTree(node) {
  const resultDiv = document.getElementById('decomposition-result');
  resultDiv.innerHTML = '';

  // Set up dimensions
  const width = resultDiv.offsetWidth;
  const height = Math.max(500, window.innerHeight * 0.6);

  // Create SVG container
  const svg = d3.select('#decomposition-result')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'bg-slate-800/60 rounded-lg');

  // Create the hierarchical data structure D3 expects
  const hierarchy = d3.hierarchy(convertToD3Format(node));

  // Create force simulation
  const simulation = d3.forceSimulation(hierarchy.descendants())
    .force('link', d3.forceLink(hierarchy.links())
      .id(d => d.id)
      .distance(100)
      .strength(1))
    .force('charge', d3.forceManyBody().strength(-500))
    .force('x', d3.forceX(width / 2))
    .force('y', d3.forceY(height / 2));

  // Create links
  const links = svg.append('g')
    .selectAll('line')
    .data(hierarchy.links())
    .join('line')
    .attr('class', 'stroke-blue-300/30')
    .attr('stroke-width', 1);

  // Create nodes
  const nodes = svg.append('g')
    .selectAll('g')
    .data(hierarchy.descendants())
    .join('g')
    .attr('class', 'cursor-pointer')
    .call(drag(simulation));

  // Add rectangles for nodes
  nodes.append('rect')
    .attr('class', d => d.data.isAtomic ? 
      'fill-green-400/20 stroke-green-300/50' : 
      'fill-blue-400/20 stroke-blue-300/50')
    .attr('rx', 6)
    .attr('ry', 6)
    .attr('stroke-width', 1);

  // Add text labels
  const nodeTexts = nodes.append('text')
    .attr('class', 'text-sm text-blue-200 pointer-events-none')
    .attr('dy', '0.35em')
    .attr('text-anchor', 'middle')
    .text(d => d.data.task)
    .each(function(d) {
      const padding = 10;
      const bbox = this.getBBox();
      d.width = bbox.width + padding * 2;
      d.height = bbox.height + padding * 2;
    });

  // Update rectangle sizes based on text
  nodes.select('rect')
    .attr('width', d => d.width)
    .attr('height', d => d.height)
    .attr('x', d => -d.width / 2)
    .attr('y', d => -d.height / 2);

  // Add atomic/expand indicators
  nodes.append('text')
    .attr('class', 'text-xs pointer-events-none')
    .attr('text-anchor', 'middle')
    .attr('dy', d => (d.height / 2) + 16)
    .attr('fill', d => d.data.isAtomic ? '#34d399' : '#60a5fa')
    .text(d => d.data.isAtomic ? '[Atomic]' : 
      (!d.data.isAtomic && !d.children?.length ? '[Expand]' : ''));

  // Update positions on simulation tick
  simulation.on('tick', () => {
    links
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    nodes.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  // Handle node click for expansion
  nodes.on('click', async (event, d) => {
    if (!d.data.isAtomic && !d.children?.length) {
      const node = findNodeByTask(taskTree, d.data.task);
      if (node) {
        await decomposeNode(node);
        displayTree(taskTree);
      }
    }
  });
}

// Helper function to convert our tree format to D3 format
function convertToD3Format(node) {
  return {
    task: node.task,
    isAtomic: node.isAtomic,
    children: node.children.length > 0 ? node.children.map(convertToD3Format) : null
  };
}

// Drag handler for nodes
function drag(simulation) {
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);
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