import '@quasar/extras/material-icons/material-icons.css'
import { fetchPermissions } from '@vue-warden/example-shared/fetcher'
import { Quasar } from 'quasar'
import 'quasar/src/css/index.sass'
import { createApp } from 'vue'
import { createWarden } from 'vue-warden'
import 'vue-warden/style.css'

import App from './App.vue'
import { router } from './router'

const warden = createWarden({
  fetchPermissions,
  forbiddenRoute: 'forbidden',
  // Quasar uses `disable`; WardenField hands you the flags to map it.
  disabledClass: 'disabled'
})

createApp(App).use(Quasar, {}).use(router).use(warden).mount('#app')
