<template>
  <v-dialog v-model="dialogVisible" max-width="500">
    <v-card>
      <v-card-title>Import Font File</v-card-title>
      <v-card-text>
        <v-tabs v-model="activeTab">
          <v-tab value="dat">DAT Format</v-tab>
          <v-tab value="fnt">FNT Format</v-tab>
          <v-tab value="bfnt">BFNT Format</v-tab>
        </v-tabs>

        <v-window v-model="activeTab">
          <v-window-item value="dat">
            <DatImporter @import="handleImport" />
          </v-window-item>
          <v-window-item value="fnt">
            <FntImporter @import="handleImport" />
          </v-window-item>
          <v-window-item value="bfnt">
            <v-file-input
              v-model="selectedFile"
              accept=".bfnt"
              label="Select BFNT file"
              prepend-icon="mdi-file-import"
              @change="handleFileSelect"
            ></v-file-input>
          </v-window-item>
        </v-window>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="dialogVisible = false">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import DatImporter from './importers/DatImporter.vue';
import FntImporter from './importers/FntImporter.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['update:modelValue', 'import']);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const activeTab = ref('dat');
const selectedFile = ref(null);

function handleFileSelect(file) {
  if (file) {
    importBfntFile(file);
  }
}

function handleImport(data) {
  emit('import', data);
  dialogVisible.value = false;
}

async function importBfntFile(file) {
  try {
    // TODO: Implement BFNT file import logic
    console.log('Importing BFNT file:', file.name);
    const result = null; // Replace with actual import logic
    emit('import', result);
    dialogVisible.value = false;
  } catch (error) {
    console.error('Error importing BFNT file:', error);
  }
}
</script> 