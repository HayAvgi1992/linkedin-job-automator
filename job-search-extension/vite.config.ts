import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DIST_MANIFEST = join(process.cwd(), 'dist', 'manifest.json');
const CSP = "default-src 'self'; script-src 'self'; img-src 'self' data: blob:; connect-src 'self' http://localhost:3001";

const patchCsp = () => {
  try {
    if (!existsSync(DIST_MANIFEST)) return;
    const m = JSON.parse(readFileSync(DIST_MANIFEST, 'utf-8'));
    if (m.content_security_policy?.extension_pages === CSP) return;
    m.content_security_policy = { extension_pages: CSP };
    writeFileSync(DIST_MANIFEST, JSON.stringify(m, null, 2));
    console.log('[patch-manifest-csp] wrote CSP to dist/manifest.json');
  } catch (e) {
    console.error('[patch-manifest-csp]', e);
  }
};

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest: manifest as any }),
    {
      name: 'patch-manifest-csp',
      enforce: 'post',
      apply: () => true,
      buildEnd() {
        console.log('[patch-manifest-csp] buildEnv fired');
      },
      writeBundle() {
        console.log('[patch-manifest-csp] writeBundle fired');
        patchCsp();
      },
      CloseBundle() {
        console.log('[patch-manifest-csp] CloseBundle fired');
        patchCsp();
      },
    },
  ],
  base: '',
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: 'index.html',
      },
    },
  },
});
