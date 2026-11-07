<script setup lang="ts">
import { ref } from 'vue'
import { useWarden } from 'vue-warden'

const { guard, can } = useWarden()
const saved = ref(false)

function exportUsers(): void {
  guard('new-user.save', () => {
    window.alert('exported')
  })
}

function save(): void {
  guard('new-user.save', () => {
    saved.value = true
  })
}
</script>

<template>
  <h1>Users</h1>

  <Warden component-key="filter">
    <section class="card" data-testid="filter">
      <h2>Filter</h2>
      <input v-warden="'username'" placeholder="Username" />
      <select v-warden="'status'">
        <option>active</option>
        <option>inactive</option>
      </select>
    </section>
  </Warden>

  <Warden component-key="new-user">
    <section class="card" data-testid="new-user">
      <h2>New user</h2>
      <input v-warden="'username'" placeholder="Username" />
      <input v-warden="'email'" placeholder="Email" />
      <input v-warden="'password'" type="password" placeholder="Password" />
      <WardenField field="save" v-slot="{ canEdit }">
        <button :disabled="!canEdit" data-testid="save" @click="save">
          Save
        </button>
      </WardenField>
      <p v-if="saved" data-testid="saved">User saved</p>
    </section>
    <template #denied="{ message }">
      <section class="card denied" data-testid="new-user-denied">
        <strong>Restricted</strong> {{ message }}
      </section>
    </template>
  </Warden>

  <button data-testid="export" @click="exportUsers">
    Export (needs new-user.save) {{ can('new-user.save') ? '' : '- blocked' }}
  </button>
</template>
