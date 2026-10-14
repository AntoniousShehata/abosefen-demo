import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { readFileSync } from 'node:fs';
import { CONTENT_SECURITY_POLICY } from './csp.config.js';

// The one outward link of the app (to this repository, on «How it's built») is read from package.json here, so the
// app's own code holds no remote address (tests/no-network.test.js). A link is a page the visitor opens, not a request.
const { repository } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

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
  define: { __REPO_URL__: JSON.stringify(repository?.url ?? '') },
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
