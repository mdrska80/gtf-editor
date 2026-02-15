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
    <v-sheet class="rounded-lg pa-4 border bg-surface-variant-lighten" style="--v-theme-surface-variant: 255, 255, 255">
      <!-- Toolbar: Draw Color + Export in one row -->
      <div class="d-flex align-center justify-space-between gap-4 py-2 px-3 mb-3 bg-surface rounded border flex-wrap">
        <div class="d-flex align-center gap-2 flex-wrap">
          <span class="text-caption font-weight-bold text-medium-emphasis text-no-wrap">Draw Color:</span>
          <v-chip-group v-model="selectedDrawChar" mandatory class="ma-0">
            <v-chip
              v-for="entry in palette"
              :key="entry.char"
              :value="entry.char"
              variant="outlined"
              size="small"
              class="ma-1"
            >
              <div
                class="rounded mr-1 border"
                :style="{ backgroundColor: entry.color, width: '14px', height: '14px' }"
              ></div>
              <code class="text-caption font-weight-bold">{{ entry.char }}</code>
            </v-chip>
            <v-chip v-if="!palette || palette.length === 0" disabled size="small">
              No Colors
            </v-chip>
          </v-chip-group>
        </div>

        <div class="d-flex align-center gap-2 width-100-mobile justify-space-between-mobile">
          <v-chip-group
            v-model="selectedScale"
            mandatory
            class="ma-0"
            color="primary"
          >
            <v-chip
              v-for="scale in scaleOptions"
              :key="scale.value"
              :value="scale.value"
              size="small"
              variant="outlined"
              class="ma-0 mx-1"
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
    </v-sheet>
  </v-container>

  <v-container v-else>
    <p>No glyph data available. Select a glyph from the list.</p>
  </v-container>
</template>

<script setup>
import { defineProps, defineEmits, ref, computed, watch, onMounted, onUnmounted } from 'vue';
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

// Keyboard Shortcuts for Nudging
function handleNudgeKeydown(event) {
  if (!event.shiftKey) return; 

  // Only handle arrow keys
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;

  event.preventDefault(); // Prevent scrolling if shift is held

  switch (event.key) {
    case 'ArrowUp':
      shiftBitmap(0, -1);
      break;
    case 'ArrowDown':
      shiftBitmap(0, 1);
      break;
    case 'ArrowLeft':
      shiftBitmap(-1, 0);
      break;
    case 'ArrowRight':
      shiftBitmap(1, 0);
      break;
  }
}

function shiftBitmap(dx, dy) {
  if (!props.glyphData || !props.glyphData.bitmap || !props.glyphData.size) return;

  const width = props.glyphData.size.width;
  const height = props.glyphData.size.height;
  const oldBitmap = props.glyphData.bitmap;
  const newBitmap = [];

  // Initialize new bitmap with empty/erase chars
  // Note: We need to handle if bitmap rows are strings
  
  for (let y = 0; y < height; y++) {
    let newRow = '';
    for (let x = 0; x < width; x++) {
      const srcX = x - dx;
      const srcY = y - dy;

      let char = selectedEraseChar.value; // Default to erase char (empty)

      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        // Valid source position, get char from old bitmap
        if (srcY < oldBitmap.length) {
            const srcRow = oldBitmap[srcY];
            // If row is string
            if (typeof srcRow === 'string' && srcX < srcRow.length) {
                char = srcRow[srcX];
            }
        }
      }
      newRow += char;
    }
    newBitmap.push(newRow);
  }

  handleBitmapUpdate(newBitmap);
}



onMounted(() => {
  window.addEventListener('keydown', handleNudgeKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleNudgeKeydown);
});
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

.gap-2 {
  gap: 8px;
}

.gap-4 {
  gap: 16px;
}

/* Background refinement for the editor sheet */
.bg-surface-variant-lighten {
  background: rgba(var(--v-theme-surface-variant), 0.15) !important;
  border-color: rgba(var(--v-theme-outline), 0.12) !important;
}

/* Responsive utilities usually handled by Vuetify grid but helpful here */
@media (max-width: 768px) {
  .width-100-mobile {
    width: 100%;
  }
  
  .justify-space-between-mobile {
    justify-content: space-between;
  }
}
</style>
