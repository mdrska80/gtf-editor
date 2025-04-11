<template>
  <v-container>
    <h2>Header Editor</h2>
    <v-form>
      <v-text-field
        label="Font Name"
        placeholder="MyCustomFont"
        hint="Enter the font name"
        persistent-hint
      ></v-text-field>

      <v-text-field
        label="Version"
        placeholder="1.0"
        hint="Enter the font/format version"
        persistent-hint
      ></v-text-field>

      <v-text-field
        label="Author"
        placeholder="Jan Novak"
        hint="Enter the author's name"
        persistent-hint
      ></v-text-field>

      <v-textarea
        label="Description"
        placeholder="Optional description of the font..."
        hint="Enter an optional description"
        persistent-hint
        rows="3"
      ></v-textarea>
    </v-form>
  </v-container>
</template>

<script setup>
// Later: Define props to receive header data
// Later: Define emits to send updated data back
</script>

<style scoped>
/* Add component-specific styles if needed */
</style> 