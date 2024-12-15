class BrowserManager {
  constructor() {
    this.processes = new Map(); // Map of processId -> {browser, page}
  }

  async getOrCreateProcess(processId) {
    if (this.processes.has(processId)) {
      return this.processes.get(processId);
    }

    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to specified URL
    await page.goto("https://www.google.com");
    
    const process = { browser, page };
    this.processes.set(processId, process);
    return process;
  }

  async stopProcess(processId) {
    const process = this.processes.get(processId);
    if (process) {
      await process.browser.close();
      this.processes.delete(processId);
    }
  }

  async stopAllProcesses() {
    for (const processId of this.processes.keys()) {
      await this.stopProcess(processId);
    }
  }

  isProcessRunning(processId) {
    return this.processes.has(processId);
  }

  getActiveProcesses() {
    return Array.from(this.processes.keys());
  }

  async executeCommand(processId, command) {
    const process = await this.getOrCreateProcess(processId);
    const { page } = process;

    // Parse the command string
    console.log(`command: ${command}`);
    const commandMatch = command.match(/^(\w+)\((.*)\)\.?$/);
    if (!commandMatch) {
      throw new Error('Invalid command format');
    }

    const [_, action, paramsString] = commandMatch;
    const params = paramsString.split(',').map(p => p.trim());

    // Execute the appropriate action
    switch (action.toLowerCase()) {
      case 'click':
        const [x, y] = params.map(Number);
        console.log(`[Process ${processId}] Executing click at coordinates (${x}, ${y})`);
        await page.mouse.click(x, y);
        break;

      case 'type':
        const text = params.join(',').replace(/['"]/g, ''); // Handle text with commas and remove quotes
        console.log(`[Process ${processId}] Typing text: "${text}"`);
        await page.keyboard.type(text);
        break;

      case 'scroll':
        const [scrollX, scrollY] = params.map(Number);
        console.log(`[Process ${processId}] Scrolling to position (${scrollX}, ${scrollY})`);
        await page.evaluate((x, y) => {
          window.scrollTo(x, y);
        }, scrollX, scrollY);
        break;

      case 'hover':
        const [hoverX, hoverY] = params.map(Number);
        console.log(`[Process ${processId}] Hovering at coordinates (${hoverX}, ${hoverY})`);
        await page.mouse.move(hoverX, hoverY);
        break;

      case 'gotourl':
        const url = params[0].replace(/['"]/g, '').replace(/^url=/, ''); // Remove quotes and url= prefix
        console.log(`[Process ${processId}] Navigating to URL: ${url}`);
        await page.goto(url);
        break;

      default:
        console.error(`[Process ${processId}] Unknown action: ${action}`);
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

// Export singleton instance
const browserManager = new BrowserManager();
module.exports = browserManager; 