import { mockPermissionsApi } from '@vue-warden/example-shared/mock-api'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [vue(), vuetify(), mockPermissionsApi()]
})
