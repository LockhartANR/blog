const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests', workers: 1, timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:4180', colorScheme: 'light' },
  webServer: { command: 'python -m http.server 4180 --bind 127.0.0.1 --directory public', url: 'http://127.0.0.1:4180', reuseExistingServer: false }
});

