import { mockPermissionsApi } from '@vue-warden/example-shared/mock-api'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), mockPermissionsApi()]
})
