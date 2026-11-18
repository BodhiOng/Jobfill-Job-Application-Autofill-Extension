import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { build as bundle } from 'esbuild';

export default defineConfig({
  base: './',
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: { popup: resolve(__dirname, 'src/popup/index.html'), options: resolve(__dirname, 'src/options/index.html'), sidebar: resolve(__dirname, 'src/sidebar/index.html'), dock: resolve(__dirname, 'src/dock/index.html'), content: resolve(__dirname, 'src/content/index.ts'), standalone: resolve(__dirname, 'src/content/standalone.ts'), background: resolve(__dirname, 'src/background/index.ts') }, output: { entryFileNames: (chunk) => chunk.name === 'content' || chunk.name === 'standalone' || chunk.name === 'background' ? `assets/${chunk.name === 'standalone' ? 'content-standalone' : chunk.name}.js` : 'assets/[name]-[hash].js', chunkFileNames: 'assets/chunk-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' } } },
  plugins: [{ name: 'copy-extension-assets', async closeBundle() {
    mkdirSync(resolve(__dirname, 'dist'), { recursive: true });
    for (const page of ['popup', 'options', 'sidebar', 'dock']) mkdirSync(resolve(__dirname, `dist/${page}`), { recursive: true });
    copyFileSync(resolve(__dirname, 'src/manifest.json'), resolve(__dirname, 'dist/manifest.json'));
    for (const page of ['popup', 'options', 'sidebar', 'dock']) {
      const html = readFileSync(resolve(__dirname, `dist/src/${page}/index.html`), 'utf8').replace(/\.\.\/\.\.\/assets\//g, '../assets/');
      writeFileSync(resolve(__dirname, `dist/${page}/index.html`), html);
    }
    cpSync(resolve(__dirname, 'src/styles'), resolve(__dirname, 'dist/styles'), { recursive: true });

    // WebExtension content scripts are classic scripts in Firefox MV2. Vite's
    // normal output can contain ESM imports, so bundle these two entry points
    // as self-contained IIFEs before handing the folder to about:debugging.
    for (const [entry, output] of [
      ['src/content/index.ts', 'dist/assets/content.js'],
      ['src/content/standalone.ts', 'dist/assets/content-standalone.js']
    ] as const) {
      await bundle({
        entryPoints: [resolve(__dirname, entry)],
        outfile: resolve(__dirname, output),
        bundle: true,
        format: 'iife',
        platform: 'browser',
        target: 'es2020',
        sourcemap: false
      });
    }
  } }]
});
