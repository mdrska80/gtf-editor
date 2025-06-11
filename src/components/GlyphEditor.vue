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
          variant="outlined"
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
          <div class="d-flex align-center justify-space-between mb-3">
            <h3>Bitmap Editor</h3>
            
            <!-- Compact Color Picker - Right next to the title -->
            <div class="compact-color-picker">
              <span class="color-picker-label">Draw Color:</span>
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

          <!-- Hybrid Bitmap Grid (Auto-switches DOM/Canvas based on size) -->
          <HybridBitmapGrid
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
import HybridBitmapGrid from './HybridBitmapGrid.vue';
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

// Computed properties
const hasDefaultPalette = computed(
  () => props.headerDefaultPalette && props.headerDefaultPalette.length > 0
);

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

.color-picker-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface-variant));
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

/* Responsive adjustments */
@media (max-width: 768px) {
  .compact-color-picker {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .color-picker-label {
    font-size: 0.8rem;
  }
  
  .bitmap-editing-section {
    padding: 12px;
  }
}
</style>
