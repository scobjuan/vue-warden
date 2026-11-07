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
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>vue-warden + Quasar</q-toolbar-title>
        <template v-for="name in links" :key="name">
          <q-btn
            v-if="warden.canAccessRoute(name)"
            flat
            :to="{ name }"
            :label="name"
          />
        </template>
        <q-select
          v-model="role"
          :options="roles"
          dense
          dark
          borderless
          data-testid="role"
          @update:model-value="changeRole"
        />
      </q-toolbar>
    </q-header>
    <q-page-container>
      <q-page padding>
        <WardenGate><RouterView /></WardenGate>
      </q-page>
    </q-page-container>
  </q-layout>
</template>
