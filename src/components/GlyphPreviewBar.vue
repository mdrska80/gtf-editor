<template>
  <div class="preview-bar-container">
    <v-sheet 
        class="mx-auto pa-1"
        elevation="1"
        max-width="100%"
    >
        <v-slide-group 
            v-model="slideModel" 
            class="pa-0" 
            show-arrows
        >
            <v-slide-group-item
                v-for="glyph in glyphs"
                :key="glyph.name" 
            >
                <GlyphPreview
                    :glyph="glyph"
                    :default-palette="defaultPalette"
                    @select="selectGlyph"
                    :class="{ 'selected-preview': glyph.name === selectedGlyphName }" 
                />
            </v-slide-group-item>
        </v-slide-group>
    </v-sheet>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';
import GlyphPreview from './GlyphPreview.vue';

const props = defineProps({
  glyphs: {
    type: Array, // Array of full Glyph objects
    required: true,
    default: () => []
  },
  defaultPalette: {
      type: Array, // Processed default palette array [{char, color}]
      default: () => []
  },
  selectedGlyphName: {
      type: String,
      default: null
  }
});

const emit = defineEmits(['select-glyph']);

const slideModel = ref(null); // For v-slide-group model if needed

function selectGlyph(glyphName) {
    emit('select-glyph', glyphName);
}

</script>

<style scoped>
.preview-bar-container {
    width: 100%;
    background-color: #f5f5f5; /* Light background for the bar area */
    padding: 4px 0;
    border-bottom: 1px solid #ddd;
}

/* Optional: Style the selected preview */
.selected-preview {
    border: 2px solid #1976D2; /* Vuetify primary color */
    margin: 1px; /* Adjust margin to account for border */
    box-shadow: 0 0 5px rgba(25, 118, 210, 0.5);
}
</style> 