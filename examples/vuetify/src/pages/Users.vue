<script setup lang="ts">
import { ref } from 'vue'
import { useWarden } from 'vue-warden'

const { guard } = useWarden()
const saved = ref(false)
</script>

<template>
  <h1 class="text-h5 mb-4">Users (Vuetify)</h1>

  <Warden component-key="new-user">
    <v-card class="pa-4" data-testid="new-user">
      <WardenField field="username" v-slot="{ canEdit }">
        <v-text-field label="Username" :disabled="!canEdit" density="compact" />
      </WardenField>
      <WardenField field="email" v-slot="{ canEdit }">
        <v-text-field label="Email" :disabled="!canEdit" density="compact" />
      </WardenField>
      <WardenField field="password" v-slot="{ canEdit }">
        <v-text-field
          label="Password"
          type="password"
          :disabled="!canEdit"
          density="compact"
        />
      </WardenField>
      <WardenField field="save" v-slot="{ canEdit }">
        <v-btn
          color="primary"
          :disabled="!canEdit"
          data-testid="save"
          @click="guard('new-user.save', () => (saved = true))"
        >
          Save
        </v-btn>
      </WardenField>
      <v-alert v-if="saved" type="success" class="mt-4">User saved</v-alert>
    </v-card>
    <template #denied="{ message }">
      <v-alert type="error" data-testid="new-user-denied">{{
        message
      }}</v-alert>
    </template>
  </Warden>
</template>
