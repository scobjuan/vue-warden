<script setup lang="ts">
import { useWarden } from 'vue-warden'

definePageMeta({ name: 'users', warden: true })
const { guard } = useWarden()
const saved = ref(false)
</script>

<template>
  <h1>Users</h1>
  <Warden component-key="new-user">
    <section data-testid="new-user">
      <WardenField field="username" v-slot="{ canEdit }">
        <input placeholder="Username" :disabled="!canEdit" />
      </WardenField>
      <WardenField field="email" v-slot="{ canEdit }">
        <input placeholder="Email" :disabled="!canEdit" />
      </WardenField>
      <WardenField field="save" v-slot="{ canEdit }">
        <button
          :disabled="!canEdit"
          data-testid="save"
          @click="guard('new-user.save', () => (saved = true))"
        >
          Save
        </button>
      </WardenField>
      <p v-if="saved">User saved</p>
    </section>
    <template #denied="{ message }">
      <p data-testid="new-user-denied">{{ message }}</p>
    </template>
  </Warden>
</template>
