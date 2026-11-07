import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  platform: 'neutral',
  deps: { neverBundle: ['vue', 'vue-router'] },
  minify: true
})
