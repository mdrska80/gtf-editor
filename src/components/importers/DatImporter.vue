<template>
  <div>
    <v-file-input
      v-model="selectedFile"
      accept=".dat"
      label="Select DAT file"
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
    importDatFile(file);
  }
}

async function importDatFile(file) {
  try {
    // TODO: Implement DAT file import logic
    console.log('Importing DAT file:', file.name);
    const result = null; // Replace with actual import logic
    emit('import', result);
  } catch (error) {
    console.error('Error importing DAT file:', error);
  }
}
</script> 