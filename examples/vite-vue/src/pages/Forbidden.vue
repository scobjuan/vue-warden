<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <h1>Forbidden</h1>
  <p data-testid="forbidden">
    You cannot open <code>{{ route.query.from }}</code> with your role.
  </p>
</template>
