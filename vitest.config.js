import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Upgrade plan C3 — coverage ratchet: CI fails when coverage drops below the
    // ratchet. Baseline 2026-10-03 was 61.85% lines; raise these with each release.
    coverage: {
      provider: 'v8',
      include: [
        'ai-postprocess.js', 'contextual-jitter-engine.js', 'cursive-connector.js',
        'diagram-engine.js', 'export-manager.js', 'export-renderers.js',
        'flashcards.js', 'font-compilation.js', 'margin-labels.js',
        'markdown-parser.js', 'paper-renderer.js', 'persistence.js', 'state.js',
        'stroke-prediction-engine.js', 'template-manager.js',
      ],
      thresholds: { lines: 52, branches: 42, functions: 54, statements: 51 },
    },
    include: ['**/*.test.js'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'sw.js',
      'vite.config.js',
      'cursive-connector.test.js',
      'doubt-solver.test.js',
      'solution-streaming.test.js',
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
