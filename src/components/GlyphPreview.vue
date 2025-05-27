<template>
  <div
    class="glyph-preview-container"
    :style="containerStyle"
    :title="`${glyph.name} (${glyph.size?.width || '?'}x${glyph.size?.height || '?'})`"
    @click="$emit('select', glyph.name)"
  >
    <!-- Iterate through bitmap rows -->
    <template v-for="(row, y) in glyph.bitmap" :key="y">
      <!-- Iterate through chars in the row -->
      <template v-for="(char, x) in row.split('')" :key="`${y}-${x}`">
        <div class="preview-cell" :style="getCellStyle(char)">
          <!-- Empty div, styled by CSS -->
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue';

const props = defineProps({
  glyph: {
    type: Object, // Expecting the full Glyph object
    required: true,
  },
  // Pass the *processed* default palette array [{char, color}]
  defaultPalette: {
    type: Array,
    default: () => [],
  },
  targetHeight: {
    type: Number,
    default: 64, // Target height in pixels for the preview (Increased from 32)
  },
});

defineEmits(['select']);

// Determine which palette to use (glyph's or default)
const effectivePaletteArray = computed(() => {
  // Check if glyph has its own non-empty palette
  if (
    props.glyph.palette &&
    props.glyph.palette.entries &&
    Object.keys(props.glyph.palette.entries).length > 0
  ) {
    // Convert glyph palette entries object to array format
    return Object.entries(props.glyph.palette.entries).map(([char, color]) => ({
      char,
      color,
    }));
  } else {
    // Otherwise, use the default palette passed as prop
    return props.defaultPalette;
  }
});

const containerStyle = computed(() => {
  const width = props.glyph.size?.width || 1;
  const height = props.glyph.size?.height || 1;
  const aspectRatio = width / height;

  // Calculate width to maintain aspect ratio based on target height
  const calculatedWidth = Math.round(props.targetHeight * aspectRatio);

  return {
    width: `${calculatedWidth}px`,
    height: `${props.targetHeight}px`,
    display: 'grid',
    gridTemplateColumns: `repeat(${width}, 1fr)`,
    gridTemplateRows: `repeat(${height}, 1fr)`,
    cursor: 'pointer',
    margin: '2px',
    backgroundColor: 'transparent',
    // Ensure the container respects its calculated dimensions
    minWidth: `${calculatedWidth}px`,
    minHeight: `${props.targetHeight}px`,
    maxWidth: `${calculatedWidth}px`,
    maxHeight: `${props.targetHeight}px`,
  };
});

// Get style for individual cell (background color ONLY)
function getCellStyle(char) {
  const paletteEntry = effectivePaletteArray.value.find((p) => p.char === char);
  return {
    backgroundColor: paletteEntry ? paletteEntry.color : 'transparent',
    // Removed explicit width and height
  };
}
</script>

<style scoped>
.glyph-preview-container {
  display: inline-block; /* Keep inline-block for bar layout */
  vertical-align: top;
  overflow: hidden; /* Hide any slight overflows */
  position: relative; /* For potential future overlays/tooltips */
  box-sizing: border-box;
}
.glyph-preview-container:hover {
  /* Use theme outline color for hover border */
  border-color: rgb(var(--v-theme-outline));
  /* Use a theme-based shadow or remove if not desired */
  box-shadow: 0 0 3px rgba(var(--v-shadow-key-umbra-opacity), 0.2);
}

/* Removed .preview-row style */

.preview-cell {
  /* Basic cell style, background set dynamically */
  /* width/height set dynamically via getCellStyle */
  line-height: 0; /* Ensure no extra space */
  font-size: 0; /* Hide potential character display */
}
</style>
