<template>
  <v-container v-if="glyphData" class="glyph-editor-container">
    <GlyphValidationWarnings
      :validation-warnings="glyphData.validation_warnings"
    />

    <!-- Section 1: Metadata + Palette side-by-side -->
    <v-row class="mb-4">
      <GlyphMetadataEditor
        :glyph-data="glyphData"
        @update:glyphField="$emit('update:glyphField', $event)"
      />

      <v-col cols="12" md="6">
        <h3 class="section-title">Palette Management</h3>
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
        <PaletteEditor
          :entries="glyphData.palette?.entries || {}"
          @update:palette="handleGlyphPaletteUpdate"
        />
      </v-col>
    </v-row>

    <!-- Section 2: Bitmap Editor -->
    <div class="bitmap-section">
      <!-- Toolbar: Draw Color + Export in one row -->
      <div class="bitmap-toolbar">
        <div class="toolbar-left">
          <span class="toolbar-label">Draw Color:</span>
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

        <div class="toolbar-right">
          <v-chip-group
            v-model="selectedScale"
            mandatory
            class="scale-chips"
            color="primary"
          >
            <v-chip
              v-for="scale in scaleOptions"
              :key="scale.value"
              :value="scale.value"
              size="small"
              variant="outlined"
            >
              {{ scale.label }}
            </v-chip>
          </v-chip-group>
          <v-btn
            prepend-icon="mdi-file-image-outline"
            variant="elevated"
            size="small"
            color="primary"
            :disabled="!canExport"
            :loading="isExportingBMP"
            @click="exportAsBMP"
          >
            Export BMP
          </v-btn>
        </div>
      </div>

      <!-- Export Status (only shown after export) -->
      <v-alert
        v-if="exportStatus"
        :type="exportStatus.type"
        variant="tonal"
        density="compact"
        closable
        class="mb-3"
        @click:close="exportStatus = null"
      >
        {{ exportStatus.message }}
        <template v-if="exportStatus.type === 'success' && exportStatus.filename" #append>
          <v-btn size="small" variant="text" @click="openFile" class="ml-2">Open</v-btn>
        </template>
      </v-alert>

      <!-- Canvas Bitmap Grid -->
      <CanvasBitmapGrid
        ref="canvasBitmapGridRef"
        :bitmap="glyphData.bitmap"
        :size="glyphData.size"
        :palette="palette"
        :selected-draw-char="selectedDrawChar"
        :selected-erase-char="selectedEraseChar"
        @update:bitmap="handleBitmapUpdate"
      />

      <!-- Text Views (collapsible) -->
      <v-expansion-panels class="mt-4" variant="accordion">
        <v-expansion-panel v-if="glyphData && glyphData.bitmap">
          <v-expansion-panel-title>
            <v-icon size="small" class="mr-2">mdi-code-braces</v-icon>
            Bitmap Text View
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <BitmapTextView
              :bitmap="glyphData.bitmap"
              @update:bitmap="handleBitmapTextUpdate"
            />
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel v-if="glyphData">
          <v-expansion-panel-title>
            <v-icon size="small" class="mr-2">mdi-text-box-outline</v-icon>
            Glyph Source View
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <GlyphTextView :glyph-data="glyphData" />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
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
  // Sanitize the glyph name for use in filenames
  const sanitizedName = glyphName
    .replace(/[^\w\-_.]/g, '_') // Replace non-alphanumeric chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    || 'glyph'; // Fallback if name becomes empty
  
  const scale = selectedScale.value;
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `${sanitizedName}_${scale}x_${timestamp}.${extension}`;
  
  console.log('Generated filename:', filename, 'from glyph name:', glyphName);
  return filename;
}

function downloadBlob(blob, filename) {
  console.log('Downloading blob:', { 
    filename, 
    blobSize: blob.size, 
    blobType: blob.type 
  });
  
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Add link to DOM temporarily to ensure it works in all browsers
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
    console.log('Download triggered for:', filename);
    console.log('Check your browser downloads or Downloads folder for the file');
  } catch (error) {
    console.error('Download failed:', error);
    showExportError(`Download failed: ${error.message}`);
  }
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
    message: `${fileType} exported: ${filename} (${size})`,
    filename: filename,
    blobUrl: blobUrl
  };
}

function openFile() {
  if (exportStatus.value && exportStatus.value.blobUrl) {
    window.open(exportStatus.value.blobUrl, '_blank');
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
.glyph-editor-container {
  max-width: 1400px;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: rgb(var(--v-theme-on-surface));
}

/* Bitmap Section */
.bitmap-section {
  background: rgba(var(--v-theme-surface-variant), 0.15);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
}

/* Toolbar - single row with draw colors and export */
.bitmap-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: rgba(var(--v-theme-surface), 0.6);
  border-radius: 6px;
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface-variant));
  white-space: nowrap;
}

/* Color chips */
.color-chip-group {
  margin: 0;
  gap: 4px;
}

.color-chip {
  min-height: 28px;
}

.color-swatch-inline {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  margin-right: 4px;
  border: 1px solid rgba(var(--v-theme-outline), 0.3);
  flex-shrink: 0;
}

.char-code-inline {
  font-size: 0.7rem;
  font-weight: 600;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
}

/* Scale chips */
.scale-chips {
  margin: 0;
  gap: 2px;
}

/* Responsive */
@media (max-width: 768px) {
  .bitmap-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .toolbar-right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
