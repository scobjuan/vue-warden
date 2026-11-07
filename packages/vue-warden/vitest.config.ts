import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { vue: 'vue/dist/vue.esm-bundler.js' } },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/core/types.ts'],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 }
    }
  }
})
