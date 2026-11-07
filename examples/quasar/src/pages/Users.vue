<script setup lang="ts">
import { ref } from 'vue'
import { useWarden } from 'vue-warden'

const { guard } = useWarden()
const saved = ref(false)
</script>

<template>
  <h1 class="text-h5">Users (Quasar)</h1>

  <Warden component-key="new-user">
    <q-card class="q-pa-md q-gutter-sm" data-testid="new-user">
      <WardenField field="username" v-slot="{ canEdit }">
        <q-input label="Username" :disable="!canEdit" outlined dense />
      </WardenField>
      <WardenField field="email" v-slot="{ canEdit }">
        <q-input label="Email" :disable="!canEdit" outlined dense />
      </WardenField>
      <WardenField field="password" v-slot="{ canEdit }">
        <q-input
          label="Password"
          type="password"
          :disable="!canEdit"
          outlined
          dense
        />
      </WardenField>
      <WardenField field="save" v-slot="{ canEdit }">
        <q-btn
          color="primary"
          label="Save"
          :disable="!canEdit"
          data-testid="save"
          @click="guard('new-user.save', () => (saved = true))"
        />
      </WardenField>
      <q-banner v-if="saved" class="bg-positive text-white"
        >User saved</q-banner
      >
    </q-card>
    <template #denied="{ message }">
      <q-banner class="bg-negative text-white" data-testid="new-user-denied">
        {{ message }}
      </q-banner>
    </template>
  </Warden>
</template>
