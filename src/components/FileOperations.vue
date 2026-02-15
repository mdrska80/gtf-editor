<template>
  <v-card variant="flat" class="pa-2 bg-surface border-b">
    <div class="d-flex align-center flex-wrap gap-2">

      <!-- File Info (Left) - Placeholder since we don't have file info props here yet, but structure is ready -->
       <!--
      <div class="d-flex align-center gap-3 mr-auto">
        <v-icon color="primary" size="32">mdi-file-document-outline</v-icon>
        <div class="d-flex flex-column">
          <span class="text-subtitle-1 font-weight-bold lh-1">{{ store.currentFilePath.value ? store.currentFilePath.value.split('/').pop() : 'Unsaved File' }}</span>
          <span class="text-caption text-medium-emphasis">{{ store.currentFilePath.value || 'No file path' }}</span>
        </div>
      </div>
      -->

      <!-- Actions (Right) -->
      <div class="d-flex align-center gap-2">

      <v-btn
        prepend-icon="mdi-file-outline"
        aria-label="Create a new GTF file"
          variant="flat"
          size="small"
        color="#5865f2"
        @click="handleNewFile"
      >
        New File
      </v-btn>

      <v-btn
          prepend-icon="mdi-folder-open-outline"
          variant="text"
          size="small"
          @click="handleOpenFile"
          :loading="isLoading"
        >
          Open
        </v-btn>

        <v-btn
          prepend-icon="mdi-content-save-outline"
          variant="tonal"
          size="small"
          color="primary"
          @click="handleSaveFile"
          :disabled="!canSave"
          :loading="isLoading"
        >
          Save
        </v-btn>

        <v-btn
          prepend-icon="mdi-content-save-edit-outline"
          variant="text"
          size="small"
          @click="handleSaveFileAs"
          :disabled="!canSave"
          :loading="isLoading"
        >
          Save As...
        </v-btn>

        <v-divider vertical class="mx-1"></v-divider>

        <v-btn
          prepend-icon="mdi-import"
          variant="text"
          size="small"
          @click="handleImportClick"
        >
          Import
        </v-btn>
      </div>
    </div>

    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="compact"
      class="mt-2"
      closable
      @click:close="clearError"
    >
      {{ error }}
    </v-alert>

    <!-- Import Dialog -->
    <FileImport v-model="importDialogVisible" @import="handleImport" />
  </v-card>
</template>

<script setup>
import { ref } from 'vue';
import FileImport from './FileImport.vue';
import { useFileOperations } from '../composables/useFileOperations';
import { useGtfStore } from '../composables/useGtfStore';

// We don't really need props for data anymore since we use store logic,
// but we might keep them if we wanted to stay pure.
// However, shifting to store-centric.
const store = useGtfStore();
const { 
  isLoading, 
  error, 
  canSave, 
  clearError, 
  handleNewFile,
  handleOpenFile, 
  handleSaveFile, 
  handleSaveFileAs 
} = useFileOperations();

const importDialogVisible = ref(false);

function handleImportClick() {
  importDialogVisible.value = true;
}

function openImportDialog() {
  importDialogVisible.value = true;
}

defineExpose({
  openImportDialog
});

function handleImport(importedData) {
  // TODO: Handle the imported data merging into store
  console.log('Imported data:', importedData);
  if (importedData) {
      // Logic to merge import? 
      // For now, let's just log it. The original code didn't do much.
      // If import returns full GTF structure, we might want to set it?
      // Or if it returns glyphs, add them?
      alert("Import logic not fully implemented yet in store.");
  }
}
</script>
