<script setup lang="ts">
import { roles } from '@vue-warden/example-shared/permissions'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWarden } from 'vue-warden'

const warden = useWarden()
const router = useRouter()
const role = ref(localStorage.getItem('role') ?? 'admin')
const links = ['home', 'users', 'billing', 'settings']

warden.prefetch(links)

async function changeRole(): Promise<void> {
  localStorage.setItem('role', role.value)
  warden.clear()
  await router.replace({ name: 'home' })
  await warden.prefetch(links)
}
</script>

<template>
  <header class="bar">
    <strong>vue-warden</strong>
    <nav data-testid="menu">
      <template v-for="name in links" :key="name">
        <RouterLink v-if="warden.canAccessRoute(name)" :to="{ name }">
          {{ name }}
        </RouterLink>
      </template>
    </nav>
    <label>
      Role
      <select v-model="role" data-testid="role" @change="changeRole">
        <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
      </select>
    </label>
  </header>
  <main>
    <WardenGate>
      <RouterView />
    </WardenGate>
  </main>
</template>
