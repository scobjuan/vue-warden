import { fetchPermissions } from '@vue-warden/example-shared/fetcher'
import { createApp } from 'vue'
import { createWarden } from 'vue-warden'
import 'vue-warden/style.css'

import App from './App.vue'
import { router } from './router'
import './style.css'

const warden = createWarden({
  fetchPermissions,
  forbiddenRoute: 'forbidden',
  onError: (error) => {
    console.error('[vue-warden]', error)
  }
})

createApp(App).use(router).use(warden).mount('#app')
