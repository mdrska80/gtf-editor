<template>
  <v-dialog v-model="dialogVisible" max-width="500">
    <v-card>
      <v-card-title>Import Font File</v-card-title>
      <v-card-text>
        <v-file-input
          v-model="selectedFile"
          accept=".dat,.fnt,.bfnt"
          label="Select font file"
          prepend-icon="mdi-file-import"
          @change="handleFileSelect"
        ></v-file-input>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="importFile" :disabled="!selectedFile">
          Import
        </v-btn>
        <v-btn @click="dialogVisible = false">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';

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

const selectedFile = ref(null);

function handleFileSelect(file) {
  selectedFile.value = file;
}

async function importFile() {
  if (!selectedFile.value) return;

  const fileExtension = selectedFile.value.name.split('.').pop().toLowerCase();
  let result = null;

  try {
    switch (fileExtension) {
      case 'dat':
        result = await importDatFile(selectedFile.value);
        break;
      case 'fnt':
        result = await importFntFile(selectedFile.value);
        break;
      case 'bfnt':
        result = await importBfntFile(selectedFile.value);
        break;
      default:
        console.error('Unsupported file format:', fileExtension);
        return;
    }

    if (result) {
      emit('import', result);
      dialogVisible.value = false;
    }
  } catch (error) {
    console.error('Error importing file:', error);
  }
}

// Placeholder methods for different file formats
async function importDatFile(file) {
  // TODO: Implement DAT file import
  console.log('Importing DAT file:', file.name);
  return null;
}

async function importFntFile(file) {
  // TODO: Implement FNT file import
  console.log('Importing FNT file:', file.name);
  return null;
}

async function importBfntFile(file) {
  // TODO: Implement BFNT file import
  console.log('Importing BFNT file:', file.name);
  return null;
}
</script> 