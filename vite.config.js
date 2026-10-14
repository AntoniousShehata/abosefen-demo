import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { CONTENT_SECURITY_POLICY } from './csp.config.js';

function contentSecurityPolicy() {
  return {
    name: 'demo-content-security-policy',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<!--csp-->',
        `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`,
      );
    },
  };
}

export default defineConfig({
  // Relative base + HashRouter: the same build works at https://<user>.github.io/<repo>/ or from any folder.
  base: './',
  plugins: [react(), contentSecurityPolicy()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    // The API, data and tooling tests run in plain node (fast); the page tests ask for jsdom in their first line.
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx}'],
    testTimeout: 15000,
  },
});
