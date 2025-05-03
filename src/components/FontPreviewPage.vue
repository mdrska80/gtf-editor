<template>
  <v-container>
    <h2>Font Preview</h2>
    <p class="text-caption mb-4">Type text below to see it rendered using the currently loaded font glyphs.</p>

    <v-row>
      <v-col cols="12">
        <v-textarea
          v-model="sampleText"
          label="Sample Text"
          rows="4"
          auto-grow
          outlined
          clearable
          persistent-hint
          hint="Enter text here"
        ></v-textarea>
      </v-col>
    </v-row>

    <v-divider class="my-4"></v-divider>

    <v-row>
      <v-col cols="12">
        <h3>Preview:</h3>
        <div v-if="!gtfStore.gtfData.value || !gtfStore.gtfData.value.glyphs">
          <p>No font loaded or font has no glyphs.</p>
        </div>
        <div v-else-if="!sampleText">
          <p>Enter some text above to preview.</p>
        </div>
        <!-- Render the preview -->
        <div v-else class="preview-area">
          <div v-for="(line, lineIndex) in sampleTextLines" :key="lineIndex" class="preview-line">
            <template v-for="(char, charIndex) in line" :key="charIndex">
              <!-- Restore span wrapper -->
              <span v-if="glyphMap[char]" class="preview-glyph-wrapper">
                <GlyphPreview
                  :glyph="glyphMap[char]"
                  :default-palette="processedDefaultPalette"
                  :target-height="previewGlyphHeight" 
                  class="preview-glyph" 
                />
              </span>
              <span v-else class="missing-glyph-placeholder" :title="`Glyph for '${char}' not found`">
                {{ char }}
              </span>
            </template>
            <!-- Add a space for empty lines to maintain structure -->
            <span v-if="line.length === 0">&nbsp;</span>
          </div>
        </div>
      </v-col>
    </v-row>

  </v-container>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue';
import { useGtfStore } from '../composables/useGtfStore';
import GlyphPreview from './GlyphPreview.vue';

const gtfStore = useGtfStore();
const sampleText = ref('ABC abc 123 !@# ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\nSecond line with missing: xyz'); 

// --- Configuration ---
const previewGlyphHeight = ref(32); // Target height for preview glyphs
const missingCharPlaceholder = '□'; // Character to display for missing glyphs

// --- Computed Properties ---

const processedDefaultPalette = computed(() => {
    return gtfStore.gtfData.value?.header?.default_palette?.entries 
           ? Object.entries(gtfStore.gtfData.value.header.default_palette.entries).map(([char, color]) => ({char, color})) 
           : [];
});

// Create a map for quick lookup of char_repr -> glyph data
const glyphMap = computed(() => {
  const map = {};
  if (gtfStore.gtfData.value?.glyphs) {
    for (const glyph of gtfStore.gtfData.value.glyphs) {
      if (glyph.char_repr) {
        map[glyph.char_repr] = glyph;
      }
    }
  }
  return map;
});

// Split sample text into lines for rendering
const sampleTextLines = computed(() => sampleText.value?.split('\n') || []);

</script>

<style scoped>
.preview-area {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  padding: 15px;
  min-height: 100px;
  background-color: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 4px;
  line-height: 1.2; /* Adjust line height for better spacing */
  overflow-x: auto; /* Allow horizontal scrolling if needed */
}

.preview-line {
  display: block; /* Each line on its own row */
  white-space: nowrap; /* Keep characters on the same line initially */
  margin-bottom: 8px; /* Space between lines */
  line-height: calc(v-bind(previewGlyphHeight) * 1px + 8px); /* Adjust line height based on glyph height + margin */
}

/* Restore preview-glyph-wrapper */
.preview-glyph-wrapper {
  display: inline-block; /* Make the wrapper inline */
  vertical-align: bottom; /* Align wrapper */
  margin-right: 2px; /* Apply spacing to wrapper */
  line-height: 0; /* Prevent wrapper from adding extra height */
}

.preview-glyph {
  /* Styles here might be less critical now, as wrapper handles flow */
  /* vertical-align: bottom; */ /* Handled by wrapper */
}

.missing-glyph-placeholder {
  display: inline-block;
  font-family: monospace; /* Use a standard font for placeholders */
  color: rgb(var(--v-theme-error));
  border: 1px dashed rgb(var(--v-theme-error));
  min-width: 1.5em; /* Give it some width */
  height: calc(v-bind(previewGlyphHeight) * 1px); /* Match approx height */
  line-height: calc(v-bind(previewGlyphHeight) * 1px);
  text-align: center;
  margin-right: 2px;
  vertical-align: bottom;
  padding: 0 4px;
  background-color: rgba(var(--v-theme-error-rgb), 0.1);
  border-radius: 2px;
  font-size: 1.2em; /* Make placeholder char slightly larger */
}
</style>
