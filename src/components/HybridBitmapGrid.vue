<template>
  <div class="hybrid-bitmap-editor">
    <!-- Renderer Mode Info -->
    <div class="renderer-info mb-2">
      <v-chip 
        :color="rendererInfo.color" 
        size="small" 
        variant="flat"
        :prepend-icon="rendererInfo.icon"
      >
        {{ rendererInfo.text }}
      </v-chip>
      <span class="text-caption text-grey ml-2">
        {{ totalCells }} cells - {{ rendererInfo.reason }}
      </span>
    </div>

    <!-- DOM Renderer for Small Grids -->
    <BitmapGrid
      v-if="useDOMRenderer"
      :bitmap="bitmap"
      :size="size"
      :palette="palette"
      :selected-draw-char="selectedDrawChar"
      :selected-erase-char="selectedEraseChar"
      @update:bitmap="$emit('update:bitmap', $event)"
    />

    <!-- Canvas Renderer for Large Grids -->
    <CanvasBitmapGrid
      v-else
      :bitmap="bitmap"
      :size="size"
      :palette="palette"
      :selected-draw-char="selectedDrawChar"
      :selected-erase-char="selectedEraseChar"
      @update:bitmap="$emit('update:bitmap', $event)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import BitmapGrid from './BitmapGrid.vue';
import CanvasBitmapGrid from './CanvasBitmapGrid.vue';

const props = defineProps({
  bitmap: {
    type: Array,
    required: true,
  },
  size: {
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

defineEmits(['update:bitmap']);

// Performance thresholds
const DOM_THRESHOLD = 400; // 20x20 grid = 400 cells
const CANVAS_THRESHOLD = 1000; // Switch to canvas for 1000+ cells

// Computed properties
const totalCells = computed(() => {
  return (props.size?.width || 0) * (props.size?.height || 0);
});

const useDOMRenderer = computed(() => {
  return totalCells.value <= DOM_THRESHOLD;
});

const rendererInfo = computed(() => {
  const cells = totalCells.value;
  
  if (cells <= DOM_THRESHOLD) {
    return {
      color: 'success',
      icon: 'mdi-view-grid',
      text: 'DOM Renderer',
      reason: 'Optimal for small grids'
    };
  } else if (cells <= CANVAS_THRESHOLD) {
    return {
      color: 'warning', 
      icon: 'mdi-canvas',
      text: 'Canvas Renderer',
      reason: 'Better performance for medium grids'
    };
  } else {
    return {
      color: 'error',
      icon: 'mdi-canvas',
      text: 'Canvas Renderer (Heavy)',
      reason: 'Required for large grids'
    };
  }
});
</script>

<style scoped>
.hybrid-bitmap-editor {
  width: 100%;
}

.renderer-info {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 6px;
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
}
</style> 