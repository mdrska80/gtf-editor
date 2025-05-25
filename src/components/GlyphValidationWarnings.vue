<template>
  <v-alert
    v-if="validationWarnings && validationWarnings.length > 0"
    type="warning"
    title="File Loading Warnings"
    closable
    prominent
    class="mb-4"
  >
    <p>The following issues were found when loading this glyph:</p>
    <ul>
      <li v-for="(warning, index) in validationWarnings" :key="index">
        {{ warning }}
      </li>
    </ul>
    <p class="mt-2">
      Please correct the bitmap data or the palette definition.
    </p>
  </v-alert>
</template>

<script setup>
import { defineProps } from 'vue';

const props = defineProps({
  validationWarnings: {
    type: Array,
    default: () => [],
  },
});
</script>

<style scoped>
/* Validation-specific styles can be added here if needed */
</style>
