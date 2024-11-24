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
}

// Export singleton instance
const browserManager = new BrowserManager();
module.exports = browserManager; 