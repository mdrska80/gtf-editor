<template>
  <div>
    <v-btn
      color="primary"
      prepend-icon="mdi-folder-open"
      :disabled="isLoading"
      @click="handleOpenFile"
    >
      Open File
    </v-btn>

    <v-btn
      color="primary"
      prepend-icon="mdi-import"
      :disabled="isLoading"
      class="ml-2"
      @click="handleImportClick"
    >
      Import
    </v-btn>

    <v-btn
      color="primary"
      prepend-icon="mdi-content-save"
      :disabled="!canSave"
      class="ml-2"
      @click="handleSaveFile"
    >
      Save
    </v-btn>

    <v-btn
      color="primary"
      prepend-icon="mdi-content-save-cog-outline"
      :disabled="!canSave"
      class="ml-2"
      @click="handleSaveFileAs"
    >
      Save As
    </v-btn>

    <v-alert
      v-if="error"
      type="error"
      class="mt-2"
      closable
      @click:close="clearError"
    >
      {{ error }}
    </v-alert>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import FileImport from './FileImport.vue';

const props = defineProps({
  gtfData: {
    type: Object,
    required: true,
  },
  currentFilePath: {
    type: String,
    default: null,
  },
});

const emit = defineEmits([
  'update:gtfData',
  'update:currentFilePath',
  'update:currentView',
  'update:selectedGlyphName',
  'file-load-success',
]);

/** @type {import('vue').Ref<string | null>} */
const error = ref(null);
const isLoading = ref(false);
const importDialogVisible = ref(false);

const canSave = computed(() => {
  return props.gtfData !== null;
});

function clearError() {
  error.value = null;
}

async function handleOpenFile() {
  error.value = null;
  isLoading.value = true;

  try {
    const selectedPath = await open({
      multiple: false,
      filters: [
        {
          name: 'Glyph Text Format',
          extensions: ['gtf'],
        },
      ],
    });

    if (selectedPath && typeof selectedPath === 'string') {
      console.log('Selected file:', selectedPath);
      const document = await invoke('load_gtf_file', { path: selectedPath });
      console.log('Parsed document:', document);

      // --- DEBUGGING: Log the raw document received from Tauri ---
      // console.log("FileOperations - Raw Parsed Document:", JSON.stringify(document, null, 2));
      // --- END DEBUGGING ---

      emit('file-load-success', {
        gtfData: document,
        currentFilePath: selectedPath,
        currentView: 'header',
        selectedGlyphName: null,
      });
    }
  } catch (err) {
    const errorString = String(err);
    console.error('Error loading or parsing file:', errorString);

    emit('file-load-success', {
      gtfData: null,
      currentFilePath: null,
      currentView: null,
      selectedGlyphName: null,
    });

    if (errorString.includes('more bitmap lines than expected')) {
      error.value = `Warning: File loaded with known inconsistency (bitmap lines vs SIZE). Please review glyph definitions.`;
    } else {
      error.value = `Error: ${errorString}`;
      alert(`Failed to load file: ${errorString}`);
    }
  } finally {
    isLoading.value = false;
  }
}

async function handleSaveFile() {
  if (!props.gtfData || !props.currentFilePath) {
    console.warn('Save attempted but no data or file path is available.');
    return;
  }

  error.value = null;
  console.log(`Saving to current path: ${props.currentFilePath}`);

  try {
    await invoke('save_gtf_file', {
      path: props.currentFilePath,
      document: props.gtfData,
    });
    console.log('File saved successfully (overwrite).');
  } catch (saveErr) {
    const errorString = String(saveErr);
    console.error('Error saving file (overwrite):', errorString);
    error.value = `Error saving file: ${errorString}`;
    alert(`Failed to save file: ${errorString}`);
  }
}

async function handleSaveFileAs() {
  if (!props.gtfData) {
    alert('No data to save. Please open a file first.');
    return;
  }

  error.value = null;

  try {
    const savePath = await save({
      filters: [
        {
          name: 'Glyph Text Format',
          extensions: ['gtf'],
        },
      ],
      defaultPath: props.gtfData?.header?.font_name
        ? `${props.gtfData.header.font_name}.gtf`
        : 'untitled.gtf',
    });

    if (savePath) {
      console.log('Saving to file:', savePath);
      await invoke('save_gtf_file', {
        path: savePath,
        document: props.gtfData,
      });
      emit('update:currentFilePath', savePath);
    }
  } catch (err) {
    const errorString = String(err);
    console.error('Error saving file:', errorString);
    error.value = `Error saving file: ${errorString}`;
    alert(`Failed to save file: ${errorString}`);
  }
}

function handleImportClick() {
  console.log('Import button clicked (no action yet)');
  // Later, this might open a dialog or trigger the import logic
}

function handleImport(importedData) {
  // TODO: Handle the imported data
  console.log('Imported data:', importedData);
}
</script>
