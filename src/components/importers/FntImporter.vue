<template>
  <div>
    <v-file-input
      v-model="selectedFile"
      accept=".fnt"
      label="Select FNT file"
      prepend-icon="mdi-file-import"
      @change="handleFileSelect"
    ></v-file-input>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['import']);

const selectedFile = ref(null);

function handleFileSelect(file) {
  if (file) {
    importFntFile(file);
  }
}

async function importFntFile(file) {
  try {
    // TODO: Implement FNT file import logic
    console.log('Importing FNT file:', file.name);
    const result = null; // Replace with actual import logic
    emit('import', result);
  } catch (error) {
    console.error('Error importing FNT file:', error);
  }
}
</script> 