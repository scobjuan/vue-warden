import '@mdi/font/css/materialdesignicons.css'
import { fetchPermissions } from '@vue-warden/example-shared/fetcher'
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import { createWarden } from 'vue-warden'
import 'vue-warden/style.css'

import App from './App.vue'
import { router } from './router'

const warden = createWarden({ fetchPermissions, forbiddenRoute: 'forbidden' })

createApp(App).use(createVuetify()).use(router).use(warden).mount('#app')
