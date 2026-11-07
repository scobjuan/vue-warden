import { createRouter, createWebHistory } from 'vue-router'

import Billing from './pages/Billing.vue'
import Forbidden from './pages/Forbidden.vue'
import Home from './pages/Home.vue'
import Settings from './pages/Settings.vue'
import Users from './pages/Users.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/users', name: 'users', component: Users },
    { path: '/billing', name: 'billing', component: Billing },
    { path: '/settings', name: 'settings', component: Settings },
    {
      path: '/forbidden',
      name: 'forbidden',
      component: Forbidden,
      meta: { warden: false }
    }
  ]
})
