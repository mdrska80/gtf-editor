<template>
  <v-container v-if="headerData">
    <h2>Header Editor</h2>
    <v-form>
      <v-text-field
        label="Font Name"
        :model-value="headerData.font_name || ''"
        hint="Enter the font name"
        persistent-hint
        readonly
      ></v-text-field>

      <v-text-field
        label="Version"
        :model-value="headerData.version || ''"
        hint="Enter the font/format version"
        persistent-hint
        readonly
      ></v-text-field>

      <v-text-field
        label="Author"
        :model-value="headerData.author || ''"
        hint="Enter the author's name"
        persistent-hint
        readonly
      ></v-text-field>

      <v-textarea
        label="Description"
        :model-value="headerData.description || ''"
        hint="Enter an optional description"
        persistent-hint
        rows="3"
        readonly
      ></v-textarea>
    </v-form>
  </v-container>
  <v-container v-else>
     <p>No header data available.</p>
  </v-container>
</template>

<script setup>
import { defineProps } from 'vue';

// Define the expected props
const props = defineProps({
  headerData: {
    type: Object,
    required: true,
    // Provide a default structure if needed, or rely on v-if in template
    // default: () => ({ font_name: null, version: null, author: null, description: null })
  }
});

// Later: Define emits to send updated data back
</script>

<style scoped>
/* Add component-specific styles if needed */
</style> 