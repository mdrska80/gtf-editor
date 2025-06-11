<template>
  <v-col cols="12">
    <h3>Bitmap</h3>

    <CanvasBitmapGrid
      :bitmap="glyphData.bitmap"
      :size="glyphData.size"
      :palette="palette"
      :selected-draw-char="selectedDrawChar"
      :selected-erase-char="selectedEraseChar"
      @update:bitmap="handleBitmapUpdate"
    />

    <BitmapTextView
      v-if="glyphData && glyphData.bitmap"
      :bitmap="glyphData.bitmap"
      @update:bitmap="handleBitmapTextUpdate"
    />

    <GlyphTextView v-if="glyphData" :glyph-data="glyphData" />

    <p v-else>(No bitmap data or size defined)</p>
  </v-col>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
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
  selectedDrawChar: {
    type: String,
    required: true,
  },
  selectedEraseChar: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['update:glyphField']);

// Event handlers
function handleBitmapUpdate(newBitmap) {
  emit('update:glyphField', { field: 'bitmap', value: newBitmap });
}

function handleBitmapTextUpdate(newBitmap) {
  emit('update:glyphField', {
    field: 'bitmap',
    value: newBitmap,
    source: 'textUpdate',
  });
}
</script>

<style scoped>
/* Add any bitmap-specific styles here if needed */
</style>
