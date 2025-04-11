<template>
  <v-container v-if="headerData">
    <h2>Header Editor</h2>
    <v-form @submit.prevent>
      <v-text-field
        label="Font Name"
        :model-value="headerData.font_name || ''"
        @update:model-value="$emit('update:headerField', { field: 'font_name', value: $event })"
        hint="Enter the font name"
        persistent-hint
      ></v-text-field>

      <v-text-field
        label="Version"
        :model-value="headerData.version || ''"
        @update:model-value="$emit('update:headerField', { field: 'version', value: $event })"
        hint="Enter the font/format version"
        persistent-hint
      ></v-text-field>

      <v-text-field
        label="Author"
        :model-value="headerData.author || ''"
        @update:model-value="$emit('update:headerField', { field: 'author', value: $event })"
        hint="Enter the author's name"
        persistent-hint
      ></v-text-field>

      <v-textarea
        label="Description"
        :model-value="headerData.description || ''"
        @update:model-value="$emit('update:headerField', { field: 'description', value: $event })"
        hint="Enter an optional description"
        persistent-hint
        rows="3"
      ></v-textarea>
    </v-form>
  </v-container>
  <v-container v-else>
     <p>No header data available.</p>
  </v-container>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

// Define the expected props
const props = defineProps({
  headerData: {
    type: Object,
    required: true,
    // Provide a default structure if needed, or rely on v-if in template
    // default: () => ({ font_name: null, version: null, author: null, description: null })
  }
});

// Define the events that this component can emit
const emit = defineEmits(['update:headerField']);

// Later: Define emits to send updated data back
</script>

<style scoped>
/* Add component-specific styles if needed */
</style> 