<template>
  <v-container v-if="glyphData">
    <GlyphValidationWarnings
      :validation-warnings="glyphData.validation_warnings"
    />

    <v-row>
      <GlyphMetadataEditor
        :glyph-data="glyphData"
        @update:glyphField="$emit('update:glyphField', $event)"
      />

      <GlyphPaletteSection
        :glyph-data="glyphData"
        :palette="palette"
        :header-default-palette="headerDefaultPalette"
        @update:glyphField="$emit('update:glyphField', $event)"
        @update:selectedDrawChar="selectedDrawChar = $event"
        @update:selectedEraseChar="selectedEraseChar = $event"
      />
    </v-row>

    <v-row>
      <GlyphBitmapSection
        :glyph-data="glyphData"
        :palette="palette"
        :selected-draw-char="selectedDrawChar"
        :selected-erase-char="selectedEraseChar"
        @update:glyphField="handleGlyphFieldUpdate"
      />
    </v-row>
  </v-container>

  <v-container v-else>
    <p>No glyph data available. Select a glyph from the list.</p>
  </v-container>
</template>

<script setup>
import { defineProps, defineEmits, ref, computed } from 'vue';
import GlyphValidationWarnings from './GlyphValidationWarnings.vue';
import GlyphMetadataEditor from './GlyphMetadataEditor.vue';
import GlyphPaletteSection from './GlyphPaletteSection.vue';
import GlyphBitmapSection from './GlyphBitmapSection.vue';
import { useGlyphBitmapResize } from '../composables/useGlyphBitmapResize';

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
</script>

<style scoped>
/* Component specific styles can be added here if needed */
</style>
