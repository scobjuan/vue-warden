<script setup lang="ts">
import { roles } from '@vue-warden/example-shared/permissions'
import { useWarden } from 'vue-warden'

const warden = useWarden()
const role = useCookie('role', { default: () => 'admin' })
const links = ['index', 'users', 'billing']

async function changeRole(): Promise<void> {
  warden.clear()
  await navigateTo('/')
  await warden.prefetch(links)
}
</script>

<template>
  <header class="bar">
    <strong>vue-warden + Nuxt (SSR)</strong>
    <nav data-testid="menu">
      <template v-for="name in links" :key="name">
        <NuxtLink
          v-if="warden.canAccessRoute(name)"
          :to="name === 'index' ? '/' : `/${name}`"
        >
          {{ name }}
        </NuxtLink>
      </template>
    </nav>
    <select v-model="role" data-testid="role" @change="changeRole">
      <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
    </select>
  </header>
  <main>
    <WardenGate><NuxtPage /></WardenGate>
  </main>
</template>

<style>
body {
  font-family: system-ui, sans-serif;
  margin: 0;
}
.bar {
  display: flex;
  gap: 24px;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid #eaecf0;
}
nav {
  display: flex;
  gap: 16px;
  flex: 1;
}
main {
  max-width: 720px;
  margin: 24px auto;
  padding: 0 16px;
}
</style>
