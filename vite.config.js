import { defineConfig } from 'vite'
import { cpSync } from 'node:fs'

// App scripts are classic (non-module) <script> tags, so Rollup cannot bundle
// them and silently omits them from dist. Copy them verbatim so the built site
// actually runs. The roadmap (docs/roadmap.md Phase 1) converts the app to ES
// modules, after which this plugin goes away.
const COPY_ROOT_SCRIPTS = [
  'index.js',
  'ai-assistant.js',
  'ai-postprocess.js',
  'audio-recorder.js',
  'collaborative-engine.js',
  'contextual-jitter-engine.js',
  'cursive-connector.js',
  'diagram-engine.js',
  'export-renderers.js',
  'export-manager.js',
  'font-compilation.js',
  'layer-compositor.js',
  'markdown-parser.js',
  'notebooks.js',
  'paper-renderer.js',
  'script-detector.js',
  'stroke-prediction-engine.js',
  'template-manager.js',
  'text-layout.js',
  'voice-notes.js',
  'flashcards.js',
  'margin-labels.js',
  'sw.js',
  'manifest.json',
]

// Standalone About page (upstream 1.6.26): self-contained HTML with an inline
// demo script, so it is copied verbatim like the classic scripts — keeping the
// /about.html, /about.css and /inkflow_logo.jpeg URLs exact for the sw.js precache.
// index.css is copied too: Vite bundles it to a hashed /assets/ file for the page,
// but the sw.js precache list references the plain /index.css URL — without the
// root copy, cache.addAll() rejects and the service worker never installs.
const COPY_ROOT_STATIC = ['index.css', 'about.html', 'about.css', 'inkflow_logo.jpeg']

export default defineConfig({
  root: '.',
  publicDir: false,
  plugins: [
    {
      name: 'copy-root-scripts',
      closeBundle() {
        for (const file of [...COPY_ROOT_SCRIPTS, ...COPY_ROOT_STATIC]) {
          cpSync(file, `dist/${file}`)
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html'
    }
  },
  server: {
    open: process.env.CI ? false : true
  }
})
