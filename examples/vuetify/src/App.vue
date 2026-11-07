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
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-title>vue-warden + Vuetify</v-app-bar-title>
      <template v-for="name in links" :key="name">
        <v-btn v-if="warden.canAccessRoute(name)" :to="{ name }">{{
          name
        }}</v-btn>
      </template>
      <v-select
        v-model="role"
        :items="roles"
        density="compact"
        hide-details
        style="max-width: 140px"
        data-testid="role"
        @update:model-value="changeRole"
      />
    </v-app-bar>
    <v-main>
      <v-container>
        <WardenGate><RouterView /></WardenGate>
      </v-container>
    </v-main>
  </v-app>
</template>
