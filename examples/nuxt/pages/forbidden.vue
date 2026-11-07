<script setup lang="ts">
definePageMeta({ name: 'forbidden', warden: false })
const route = useRoute()
</script>

<template>
  <h1>Forbidden</h1>
  <p data-testid="forbidden">
    You cannot open {{ route.query.from }} with your role.
  </p>
</template>
