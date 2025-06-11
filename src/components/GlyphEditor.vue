<template>
  <v-container v-if="glyphData">
    <GlyphValidationWarnings
      :validation-warnings="glyphData.validation_warnings"
    />

    <!-- Top Row: Metadata and Palette Management -->
    <v-row>
      <GlyphMetadataEditor
        :glyph-data="glyphData"
        @update:glyphField="$emit('update:glyphField', $event)"
      />

      <v-col cols="12" md="6">
        <h3>Palette Management</h3>
        
        <!-- Apply default palette button -->
        <v-btn
          :disabled="!hasDefaultPalette"
          size="small"
          variant="elevated"
          color="secondary"
          class="mb-3"
          prepend-icon="mdi-format-paint"
          title="Replace current entries with header default palette"
          @click="applyDefaultPalette"
        >
          Use Default Palette
        </v-btn>

        <!-- Palette editor -->
        <PaletteEditor
          :entries="glyphData.palette?.entries || {}"
          @update:palette="handleGlyphPaletteUpdate"
        />
      </v-col>
    </v-row>

    <!-- Bottom Row: Bitmap Editing with Integrated Color Selection -->
    <v-row>
      <v-col cols="12">
        <div class="bitmap-editing-section">
          <!-- Color Picker Section - Full Width Card Style -->
          <div class="color-picker-section mb-3">
            <v-card class="color-picker-card" variant="outlined">
              <v-card-text class="color-picker-content-compact">
                <div class="color-picker-row-compact">
                  <div class="color-picker-group-compact">
                    <span class="color-picker-label-readable">Draw Color:</span>
                    <v-chip-group v-model="selectedDrawChar" mandatory class="color-chip-group">
                      <v-chip
                        v-for="entry in palette"
                        :key="entry.char"
                        :value="entry.char"
                        variant="outlined"
                        size="small"
                        class="color-chip"
                      >
                        <div
                          class="color-swatch-inline"
                          :style="{ backgroundColor: entry.color }"
                        ></div>
                        <code class="char-code-inline">{{ entry.char }}</code>
                      </v-chip>
                      <v-chip v-if="!palette || palette.length === 0" disabled size="small">
                        No Colors
                      </v-chip>
                    </v-chip-group>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- Bitmap Export Controls -->
          <div class="export-controls-section mb-3">
            <v-card class="export-card" variant="outlined">
              <v-card-text class="export-card-content-compact">
                <!-- Export Info Row - Compact -->
                <div class="export-info-row-compact mb-2">
                  <div class="export-dimension-info">
                    <span class="dimension-label-readable">Output Size:</span>
                    <v-chip 
                      v-if="exportInfo" 
                      size="small" 
                      variant="tonal" 
                      color="primary"
                      class="dimension-chip-readable"
                    >
                      <v-icon start size="small">mdi-resize</v-icon>
                      {{ exportInfo.dimensions.width }} × {{ exportInfo.dimensions.height }}px
                    </v-chip>
                    <v-chip v-else size="small" variant="outlined" disabled>
                      No bitmap data
                    </v-chip>
                  </div>
                  
                  <div class="file-size-info-compact" v-if="exportInfo">
                    <span class="size-label-readable">Est. Size:</span>
                    <div class="size-estimates-compact">
                      <span class="size-estimate-readable">PNG {{ exportInfo.estimatedFileSize.png }}</span>
                      <span class="size-estimate-readable">BMP {{ exportInfo.estimatedFileSize.bmp }}</span>
                    </div>
                  </div>
                </div>
                
                <!-- Controls Row - Compact -->
                <div class="export-controls-row-compact">
                  <!-- Scale Selection -->
                  <div class="scale-selection-group-compact">
                    <span class="control-section-label-readable">Scale:</span>
                    <v-chip-group 
                      v-model="selectedScale" 
                      mandatory 
                      class="scale-chips-compact"
                      color="primary"
                    >
                      <v-chip
                        v-for="scale in scaleOptions"
                        :key="scale.value"
                        :value="scale.value"
                        size="small"
                        variant="outlined"
                        class="scale-chip-compact"
                      >
                        {{ scale.label }}
                      </v-chip>
                    </v-chip-group>
                  </div>
                  
                  <!-- Export Actions -->
                  <div class="export-actions-group-compact">
                    <div class="export-buttons-compact">
                      <v-btn
                        prepend-icon="mdi-file-image"
                        variant="elevated"
                        size="small"
                        color="success"
                        :disabled="!canExport"
                        :loading="isExportingPNG"
                        @click="exportAsPNG"
                        class="export-btn-compact"
                      >
                        Export PNG
                      </v-btn>
                      
                      <v-btn
                        prepend-icon="mdi-file-image-outline"
                        variant="elevated"
                        size="small"
                        color="primary"
                        :disabled="!canExport"
                        :loading="isExportingBMP"
                        @click="exportAsBMP"
                        class="export-btn-compact"
                      >
                        Export BMP
                      </v-btn>
                    </div>
                  </div>
                </div>
                
                <!-- Export Status -->
                <div v-if="exportStatus" class="export-status-compact mt-2">
                  <v-alert
                    :type="exportStatus.type"
                    variant="tonal"
                    density="compact"
                    closable
                    @click:close="exportStatus = null"
                    class="export-status-alert"
                  >
                    <div class="export-status-content">
                      <div class="export-status-message">
                        {{ exportStatus.message }}
                      </div>
                      <div v-if="exportStatus.type === 'success' && exportStatus.filename" class="export-status-actions mt-2">
                        <div class="export-file-info">
                          <v-icon size="small" class="mr-1">mdi-file-download</v-icon>
                          <span class="export-file-path">Saved to Downloads/{{ exportStatus.filename }}</span>
                        </div>
                        <div class="export-action-buttons">
                          <v-btn
                            size="small"
                            variant="elevated"
                            color="success"
                            prepend-icon="mdi-file-image"
                            @click="openFile"
                            class="export-action-btn"
                          >
                            Open File
                          </v-btn>
                          <v-btn
                            size="small"
                            variant="elevated"
                            color="primary"
                            prepend-icon="mdi-folder-open"
                            @click="openDownloadsFolder"
                            class="export-action-btn"
                          >
                            Open Folder
                          </v-btn>
                        </div>
                      </div>
                    </div>
                  </v-alert>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- Canvas Bitmap Grid (High Performance for All Sizes) -->
          <CanvasBitmapGrid
            ref="canvasBitmapGridRef"
            :bitmap="glyphData.bitmap"
            :size="glyphData.size"
            :palette="palette"
            :selected-draw-char="selectedDrawChar"
            :selected-erase-char="selectedEraseChar"
            @update:bitmap="handleBitmapUpdate"
          />

          <!-- Text View and Other Tools -->
          <div class="bitmap-tools mt-4">
            <BitmapTextView
              v-if="glyphData && glyphData.bitmap"
              :bitmap="glyphData.bitmap"
              @update:bitmap="handleBitmapTextUpdate"
            />

            <GlyphTextView v-if="glyphData" :glyph-data="glyphData" />

            <p v-else>(No bitmap data or size defined)</p>
          </div>
        </div>
      </v-col>
    </v-row>
  </v-container>

  <v-container v-else>
    <p>No glyph data available. Select a glyph from the list.</p>
  </v-container>
</template>

<script setup>
import { defineProps, defineEmits, ref, computed, watch } from 'vue';
import GlyphValidationWarnings from './GlyphValidationWarnings.vue';
import GlyphMetadataEditor from './GlyphMetadataEditor.vue';
import GlyphPaletteSection from './GlyphPaletteSection.vue';
import GlyphBitmapSection from './GlyphBitmapSection.vue';
import { useGlyphBitmapResize } from '../composables/useGlyphBitmapResize';
import PaletteEditor from './PaletteEditor.vue';
import CanvasBitmapGrid from './CanvasBitmapGrid.vue';
import BitmapTextView from './BitmapTextView.vue';
import GlyphTextView from './GlyphTextView.vue';

const props = defineProps({
  glyphData: {
    type: Object,
    required: true,
  },
  palette: {
    type: Array,
    required: true,
  },
  headerDefaultPalette: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:glyphField']);

// Local state
const selectedDrawChar = ref('.');
const selectedEraseChar = ref('.');

// Export functionality state
const canvasBitmapGridRef = ref(null);
const selectedScale = ref(2); // Default to 2x scale
const isExportingPNG = ref(false);
const isExportingBMP = ref(false);
const exportStatus = ref(null);

// Scale options for export
const scaleOptions = [
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '4x', value: 4 },
  { label: '8x', value: 8 }
];

// Computed properties
const hasDefaultPalette = computed(
  () => props.headerDefaultPalette && props.headerDefaultPalette.length > 0
);

// Export-related computed properties
const canExport = computed(() => {
  return props.glyphData && 
         props.glyphData.bitmap && 
         props.glyphData.size && 
         canvasBitmapGridRef.value;
});

const exportInfo = computed(() => {
  if (!canvasBitmapGridRef.value || !props.glyphData?.size) return null;
  
  try {
    return canvasBitmapGridRef.value.getExportInfo(selectedScale.value);
  } catch (error) {
    console.warn('Error getting export info:', error);
    return null;
  }
});

// Use the bitmap resize composable
const glyphDataRef = computed(() => props.glyphData);
const { handleBitmapTextUpdate } = useGlyphBitmapResize(glyphDataRef, emit);

// Event handlers
function handleGlyphFieldUpdate(event) {
  if (event.field === 'bitmap' && event.source === 'textUpdate') {
    handleBitmapTextUpdate(event.value);
  } else {
    emit('update:glyphField', event);
  }
}

function handleGlyphPaletteUpdate(newEntries) {
  const currentPalette = props.glyphData.palette || {};
  emit('update:glyphField', {
    field: 'palette',
    value: { ...currentPalette, entries: newEntries },
  });
}

function handleBitmapUpdate(newBitmap) {
  emit('update:glyphField', { field: 'bitmap', value: newBitmap });
}

function applyDefaultPalette() {
  if (hasDefaultPalette.value) {
    emit('update:glyphField', { action: 'use_default_palette' });
  }
}

// Export functionality methods
async function exportAsPNG() {
  if (!canvasBitmapGridRef.value) {
    showExportError('Canvas not available for export');
    return;
  }

  isExportingPNG.value = true;
  exportStatus.value = null;

  try {
    const blob = await canvasBitmapGridRef.value.exportAsPNG(selectedScale.value);
    const filename = generateFilename('png');
    const blobUrl = URL.createObjectURL(blob);
    downloadBlob(blob, filename);
    showExportSuccessWithFile(filename, 'PNG', `${exportInfo.value?.dimensions.width}×${exportInfo.value?.dimensions.height}px`, blobUrl);
  } catch (error) {
    console.error('PNG export failed:', error);
    showExportError(`PNG export failed: ${error.message}`);
  } finally {
    isExportingPNG.value = false;
  }
}

async function exportAsBMP() {
  if (!canvasBitmapGridRef.value) {
    showExportError('Canvas not available for export');
    return;
  }

  isExportingBMP.value = true;
  exportStatus.value = null;

  try {
    const blob = await canvasBitmapGridRef.value.exportAsBMP(selectedScale.value);
    const filename = generateFilename('png'); // BMP exported as PNG with solid background
    const blobUrl = URL.createObjectURL(blob);
    downloadBlob(blob, filename);
    showExportSuccessWithFile(filename, 'BMP', `${exportInfo.value?.dimensions.width}×${exportInfo.value?.dimensions.height}px`, blobUrl);
  } catch (error) {
    console.error('BMP export failed:', error);
    showExportError(`BMP export failed: ${error.message}`);
  } finally {
    isExportingBMP.value = false;
  }
}

// Helper functions
function generateFilename(extension) {
  const glyphName = props.glyphData?.name || 'glyph';
  const scale = selectedScale.value;
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${glyphName}_${scale}x_${timestamp}.${extension}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function showExportSuccess(message) {
  exportStatus.value = {
    type: 'success',
    message: message
  };
}

function showExportError(message) {
  exportStatus.value = {
    type: 'error',
    message: message
  };
}

function showExportSuccessWithFile(filename, fileType, size, blobUrl) {
  exportStatus.value = {
    type: 'success',
    message: `Exported ${fileType} successfully to ${filename} (${size})`,
    filename: filename,
    blobUrl: blobUrl
  };
}

function openFile() {
  if (exportStatus.value && exportStatus.value.blobUrl) {
    // Open the image file in a new tab
    window.open(exportStatus.value.blobUrl, '_blank');
  } else {
    alert('No file available to open. Please export a file first.');
  }
}

function openDownloadsFolder() {
  // Try different methods to open Downloads folder
  try {
    // Method 1: Try to open Downloads folder (modern browsers)
    if (navigator.userAgent.includes('Chrome') || navigator.userAgent.includes('Edge')) {
      // Chrome/Edge: Open downloads page
      window.open('chrome://downloads/', '_blank');
    } else if (navigator.userAgent.includes('Firefox')) {
      // Firefox: Open downloads page
      window.open('about:downloads', '_blank');
    } else {
      // Fallback: Show instructions
      navigator.clipboard.writeText('Downloads');
      alert('File saved to Downloads folder. Check your browser\'s download manager or navigate to your Downloads folder.');
    }
  } catch (error) {
    // Fallback for any errors
    console.log('Could not open Downloads folder automatically');
    alert('File saved to Downloads folder. Please check your browser\'s download manager or navigate to your Downloads folder.');
  }
}

// Watch palette changes to keep selectedDrawChar valid
watch(
  () => props.palette,
  (newPalette) => {
    let preferredChar = '.';
    if (newPalette && newPalette.some((p) => p.char === '#')) {
      preferredChar = '#';
    } else if (newPalette && newPalette.length > 0) {
      preferredChar = newPalette[0].char;
    }

    const currentSelectionValid =
      newPalette && newPalette.some((p) => p.char === selectedDrawChar.value);

    if (
      !currentSelectionValid ||
      (preferredChar !== '.' && selectedDrawChar.value !== preferredChar)
    ) {
      selectedDrawChar.value = preferredChar;
    }

    selectedEraseChar.value = '.';
  },
  { immediate: true, deep: true }
);
</script>

<style scoped>
.bitmap-editing-section {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
}

.compact-color-picker {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(var(--v-theme-surface), 0.8);
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
}

.color-picker-label-readable {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
}

.color-chip-group {
  margin: 0;
  gap: 4px;
}

.color-chip {
  min-height: 32px;
}

.color-swatch-inline {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  margin-right: 6px;
  border: 1px solid rgba(var(--v-theme-outline), 0.3);
  flex-shrink: 0;
}

.char-code-inline {
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
}

.bitmap-tools {
  background: rgba(var(--v-theme-surface-variant), 0.1);
  border-radius: 6px;
  padding: 12px;
  border: 1px solid rgba(var(--v-theme-outline), 0.1);
}

/* Export Controls Styles */
.export-controls-section {
  margin-bottom: 12px;
}

.export-card {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.3);
}

/* Compact Export Controls - Readable and Minimal Height */
.export-card-content-compact {
  padding: 12px !important;
}

.export-info-row-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  background: rgba(var(--v-theme-primary), 0.05);
  border-radius: 6px;
  border: 1px solid rgba(var(--v-theme-primary), 0.1);
}

.export-dimension-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dimension-label-readable {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.dimension-chip-readable {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-weight: 700;
}

.file-size-info-compact {
  display: flex;
  align-items: center;
  gap: 8px;
}

.size-label-readable {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.size-estimates-compact {
  display: flex;
  gap: 8px;
  align-items: center;
}

.size-estimate-readable {
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  background: rgba(var(--v-theme-surface-variant), 0.8);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(var(--v-theme-outline), 0.3);
}

.export-controls-row-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-top: 8px;
}

.scale-selection-group-compact {
  display: flex;
  align-items: center;
  gap: 8px;
}

.export-actions-group-compact {
  display: flex;
  align-items: center;
}

.control-section-label-readable {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.scale-chips-compact {
  margin: 0;
  gap: 4px;
}

.scale-chip-compact {
  min-width: 36px;
  font-weight: 600;
}

.export-buttons-compact {
  display: flex;
  gap: 8px;
}

.export-btn-compact {
  text-transform: none;
  font-weight: 600;
  min-width: 120px;
}

.export-status-compact {
  margin-top: 8px;
}

.export-status-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.export-status-message {
  font-weight: 600;
}

.export-status-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: rgba(var(--v-theme-surface), 0.7);
  border-radius: 6px;
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
}

.export-file-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.export-file-path {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface-variant));
}

.export-action-btn {
  text-transform: none;
  font-weight: 600;
  min-width: 100px;
}

.export-action-buttons {
  display: flex;
  gap: 8px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .compact-color-picker {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .color-picker-label-readable {
    font-size: 0.8rem;
  }
  
  .bitmap-editing-section {
    padding: 12px;
  }
  
  /* Export Controls Mobile Styles */
  .export-card-title {
    font-size: 1rem;
    padding: 12px 16px 8px 16px;
  }
  
  .export-card-content {
    padding: 16px !important;
  }
  
  .export-info-row {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }
  
  .file-size-info {
    align-items: flex-start;
  }
  
  .size-estimates {
    flex-direction: row;
    gap: 8px;
    align-items: center;
  }
  
  .export-controls-row {
    flex-direction: column;
    gap: 20px;
  }
  
  .control-section-label {
    font-size: 0.8rem;
  }
  
  .scale-chips-improved {
    gap: 6px;
  }
  
  .scale-chip {
    min-width: 40px;
  }
  
  .export-buttons-improved {
    flex-direction: row;
    gap: 8px;
  }
  
  .export-btn {
    flex: 1;
    font-size: 0.875rem;
  }
}

/* Color Picker Card Styles - Matching Export Controls */
.color-picker-section {
  margin-bottom: 12px;
}

.color-picker-card {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.3);
}

.color-picker-content-compact {
  padding: 12px !important;
}

.color-picker-row-compact {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-picker-group-compact {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
